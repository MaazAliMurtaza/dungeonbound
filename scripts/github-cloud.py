"""Use the existing Git credential helper for this repository's cloud jobs.

Credentials remain in memory and are never printed, saved or added to Git.
"""
import argparse
import base64
import datetime
import json
import subprocess
import urllib.error
import urllib.request

REPO = 'MaazAliMurtaza/dungeonbound'
OWNER = REPO.split('/')[0]

def api(path, method='GET', payload=None):
    credential = subprocess.run(['git', 'credential', 'fill'], input='protocol=https\nhost=github.com\n\n',
                                capture_output=True, text=True, check=True)
    fields = dict(line.split('=', 1) for line in credential.stdout.splitlines() if '=' in line)
    secret = fields.get('password')
    if not secret:
        raise SystemExit('No GitHub credential available through the configured helper.')
    request = urllib.request.Request('https://api.github.com' + path, method=method,
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={'Authorization': 'Bearer ' + secret, 'Accept': 'application/vnd.github+json',
                 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json',
                 'User-Agent': 'Dungeonbound-project-automation'})
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            data = response.read()
            return response.status, json.loads(data) if data else None
    except urllib.error.HTTPError as error:
        return error.code, {'message': 'GitHub API request rejected'}

parser = argparse.ArgumentParser()
parser.add_argument('action', choices=['status', 'dispatch', 'runs'])
parser.add_argument('--workflow', default='android.yml')
parser.add_argument('--ref', default='main')
parser.add_argument('--api-url')
args = parser.parse_args()
if args.action == 'status':
    status, permissions = api('/repos/' + REPO + '/actions/permissions')
    runs_status, runs = api('/repos/' + REPO + '/actions/runs?per_page=5')
    today = datetime.date.today()
    billing_status, billing = api(f'/users/{OWNER}/settings/billing/usage?year={today.year}&month={today.month}')
    print(json.dumps({'permissionsStatus': status, 'actionsEnabled': (permissions or {}).get('enabled'),
                      'runsStatus': runs_status, 'recentRunCount': (runs or {}).get('total_count'),
                      'billingReadable': billing_status == 200,
                      'actionsUsageItems': [x for x in (billing or {}).get('usageItems', []) if str(x.get('product','')).lower() == 'actions']}, indent=2))
elif args.action == 'dispatch':
    if args.workflow == 'android.yml' and (not args.api_url or not args.api_url.startswith('https://')):
        raise SystemExit('Cloud APK builds require the actual HTTPS API URL.')
    status, result = api('/repos/' + REPO + '/actions/workflows/' + args.workflow + '/dispatches', 'POST',
                        {'ref': args.ref, 'inputs': {'api_url': args.api_url} if args.api_url else {}})
    print(json.dumps({'status': status, 'dispatched': status == 204}))
    raise SystemExit(0 if status == 204 else 1)
else:
    status, result = api('/repos/' + REPO + '/actions/runs?per_page=5')
    print(json.dumps({'status':status,'runs':[{k:r.get(k) for k in ['id','name','head_sha','status','conclusion','html_url']} for r in (result or {}).get('workflow_runs',[])]},indent=2))
