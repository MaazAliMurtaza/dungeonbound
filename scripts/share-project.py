"""Audit publication history and manage sharing using the existing Git helper.

Never print or persist credentials. Mutations require explicit command actions.
"""
import argparse
import hashlib
import json
import re
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = 'MaazAliMurtaza/dungeonbound'

def git(*args, binary=False):
    return subprocess.check_output(['git', '-c', 'safe.directory=' + ROOT.as_posix(), *args], cwd=ROOT, text=not binary)

def api(path, method='GET', payload=None):
    result = subprocess.run(['git', 'credential', 'fill'], input='protocol=https\nhost=github.com\n\n', capture_output=True, text=True)
    if result.returncode:
        raise SystemExit('GitHub credential helper unavailable in this execution context.')
    fields = dict(line.split('=', 1) for line in result.stdout.splitlines() if '=' in line)
    secret = fields.get('password')
    if not secret:
        raise SystemExit('No GitHub credential supplied by the configured helper.')
    request = urllib.request.Request('https://api.github.com' + path, method=method,
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={'Authorization': 'Bearer ' + secret, 'Accept': 'application/vnd.github+json',
                 'Content-Type': 'application/json', 'User-Agent': 'Dungeonbound-sharing'})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)

def audit():
    patterns = [rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
                rb'gh[pousr]_[A-Za-z0-9]{30,}', rb'github_pat_[A-Za-z0-9_]{40,}',
                rb'sb_secret_[A-Za-z0-9_-]{20,}', rb'AKIA[A-Z0-9]{16}',
                rb'eyJ[A-Za-z0-9_-]{12,}\.eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{20,}']
    objects = git('rev-list', '--objects', '--all').splitlines()
    findings, checked = [], 0
    proc = subprocess.Popen(['git', '-c', 'safe.directory=' + ROOT.as_posix(), 'cat-file', '--batch'], cwd=ROOT, stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    try:
        for entry in objects:
            oid, _, name = entry.partition(' ')
            proc.stdin.write((oid + '\n').encode()); proc.stdin.flush()
            header = proc.stdout.readline().split()
            size = int(header[2]); data = proc.stdout.read(size); proc.stdout.read(1)
            if header[1] != b'blob': continue
            checked += 1
            if re.search(r'(^|/)(\.env(?:\..*)?|[^/]+\.(?:jks|keystore))$', name) and not name.endswith('.env.example'):
                findings.append({'path': name, 'kind': 'credential filename in history'})
            if any(re.search(pattern, data) for pattern in patterns):
                findings.append({'path': name, 'kind': 'secret-shaped value in history'})
    finally:
        proc.stdin.close(); proc.wait()
    result = {'historicalBlobsChecked': checked, 'findings': findings,
              'scope': 'All locally reachable Git history; signature/credential-filename scan, not a guarantee of absence of secrets.'}
    print(json.dumps(result, indent=2))
    return result

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['audit', 'public', 'status', 'releases', 'download'])
    args = parser.parse_args()
    if args.action == 'audit': audit()
    elif args.action == 'public':
        if audit()['findings']: raise SystemExit('Publication stopped: review audit findings first.')
        result = api('/repos/' + REPO, 'PATCH', {'private': False})
        print(json.dumps({'url': result['html_url'], 'visibility': result['visibility']}))
    elif args.action == 'status':
        result = api('/repos/' + REPO)
        print(json.dumps({k: result[k] for k in ['html_url', 'visibility', 'default_branch']}))
    elif args.action == 'releases':
        releases = api('/repos/' + REPO + '/releases?per_page=5')
        print(json.dumps([{'url': r['html_url'], 'tag': r['tag_name'], 'assets': [{'name': a['name'], 'url': a['browser_download_url']} for a in r['assets']]} for r in releases], indent=2))
    else:
        releases = api('/repos/' + REPO + '/releases?per_page=5')
        asset = next((a for r in releases for a in r['assets'] if a['name'].endswith('.apk')), None)
        if not asset: raise SystemExit('No completed APK release exists.')
        destination = ROOT / 'artifacts/share/Dungeonbound.apk'
        destination.parent.mkdir(parents=True, exist_ok=True)
        # Public repository downloads need no credentials in URLs or artifacts.
        with urllib.request.urlopen(asset['browser_download_url'], timeout=180) as response:
            destination.write_bytes(response.read())
        print(json.dumps({'path': str(destination), 'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'bytes': destination.stat().st_size}))
