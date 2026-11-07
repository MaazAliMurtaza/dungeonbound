"""Stage a local Android debug build under TEMP to avoid Windows path limits.

Copies current mobile source/dependencies, excluding credentials and generated
native caches. Never deletes/moves the user's project or downloads Android SDKs.
"""
from pathlib import Path
import json
import os
import shutil
import subprocess
import tempfile
import argparse

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--stage')
args = parser.parse_args()
if args.stage:
    stage = Path(args.stage).resolve()
    if stage.parent != Path(tempfile.gettempdir()).resolve() or not stage.name.startswith('db3-'):
        raise SystemExit('Existing staging path must be a db3- directory directly under TEMP.')
else:
    stage = Path(tempfile.mkdtemp(prefix='db3-'))

def extended(path):
    return '\\\\?\\' + str(path.resolve()) if os.name == 'nt' else str(path)

def ignore(folder, names):
    path = Path(folder)
    excluded = set(names) & {'.git', '.expo', '.gradle', '.cxx', '.kotlin', '.cache'}
    excluded.update(name for name in names if name == '.env' or name.startswith('.env.'))
    if path.name == 'android' or (path.name == 'app' and path.parent.name == 'android'):
        excluded.update(set(names) & {'build'})
    return excluded

print('Staging a shorter temporary build path: ' + str(stage), flush=True)
shutil.copytree(extended(root / 'mobile'), extended(stage / 'mobile'), ignore=ignore, dirs_exist_ok=True)
(stage / 'scripts').mkdir(exist_ok=True)
shutil.copy2(root / 'scripts/build-android-local.mjs', stage / 'scripts/build-android-local.mjs')
# Keep native app CMake object directories short as well as the source path.
gradle = stage / 'mobile/android/app/build.gradle'
with gradle.open('a', encoding='utf-8') as output:
    cxx = (stage / 'cxx').as_posix()
    output.write('\nandroid.externalNativeBuild.cmake.buildStagingDirectory = file("' + cxx + '")\n')
result = subprocess.run(['node', str(stage / 'scripts/build-android-local.mjs'), '--skip-prebuild', '--abis=arm64-v8a,x86_64'], cwd=stage)
metadata = {'stage': str(stage), 'exitCode': result.returncode, 'kind': 'debug APK, requires Metro; not a production release'}
if result.returncode == 0:
    artifacts = root / 'artifacts'
    artifacts.mkdir(exist_ok=True)
    for artifact in (stage / 'artifacts').iterdir():
        if artifact.is_file():
            shutil.copy2(artifact, artifacts / artifact.name)
    metadata['artifactsCopied'] = True
(root / 'evidence/proposal-short-build.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
raise SystemExit(result.returncode)
