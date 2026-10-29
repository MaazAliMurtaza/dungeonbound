// Local debug build only. Does not install SDK packages, publish or use EAS.
import { existsSync, readFileSync, readdirSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const mobile = path.join(root, 'mobile');
const appId = JSON.parse(readFileSync(path.join(mobile, 'app.json'), 'utf8')).expo.android.package;
if (!/^[a-zA-Z]\w*(\.[a-zA-Z]\w*){2,}$/.test(appId)) throw new Error('Invalid Android package identity');
const sdk = process.env.ANDROID_HOME || path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');
const versions = readFileSync(path.join(mobile, 'node_modules/react-native/gradle/libs.versions.toml'), 'utf8');
const version = name => new RegExp(`^${name} = "([^"]+)"`, 'm').exec(versions)?.[1];
const buildTools = version('buildTools'), ndk = version('ndkVersion'), api = version('compileSdk');
const cmake = '3.30.5'; // React Native 0.88's ReactAndroid/build.gradle.kts default.
const missing = [];
for (const [label, item] of [
  [`build-tools;${buildTools}`, `build-tools/${buildTools}/source.properties`],
  [`ndk;${ndk}`, `ndk/${ndk}/source.properties`],
  [`cmake;${cmake}`, `cmake/${cmake}/source.properties`],
  ['platform-tools', 'platform-tools/adb.exe'],
]) if (!existsSync(path.join(sdk, item))) missing.push(label);
const platforms = path.join(sdk, 'platforms');
const platformFound = existsSync(platforms) && readdirSync(platforms).some(name => {
  const properties = path.join(platforms, name, 'source.properties');
  return existsSync(properties) && new RegExp(`AndroidVersion.ApiLevel\\s*=\\s*${api}\\b`).test(readFileSync(properties, 'utf8')) && existsSync(path.join(platforms, name, 'android.jar'));
});
if (!platformFound) missing.push(`platforms;android-${api}`);
if (missing.length) {
  console.error(`Missing Android SDK components: ${missing.join(', ')}`);
  console.error('No APK produced. Obtain installer approval, then install through Android Studio SDK Manager. This script never downloads SDK components automatically.');
  process.exit(1);
}
console.log(`PASS: local SDK prerequisites (API ${api}, Build Tools ${buildTools}, NDK ${ndk}, CMake ${cmake})`);
if (process.argv.includes('--check')) process.exit(0);
const env = { ...process.env, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk, CMAKE_VERSION: cmake };
function run(exe, args, cwd = mobile) {
  const result = spawnSync(exe, args, { cwd, env, stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error('Local Android build command failed; no success claimed');
}
run(process.execPath, [path.join(mobile, 'node_modules/expo/bin/cli'), 'prebuild', '--platform', 'android', '--no-install']);
const command = 'gradlew.bat :app:assembleDebug -PreactNativeDevServerPort=8082 -PreactNativeArchitectures=x86_64 -Pandroid.builder.sdkDownload=false --max-workers=2';
run('cmd.exe', ['/d', '/s', '/c', command], path.join(mobile, 'android'));
const built = path.join(mobile, 'android/app/build/outputs/apk/debug/app-debug.apk');
if (!existsSync(built)) throw new Error('Gradle did not produce the expected debug APK');
const artifacts = path.join(root, 'artifacts'); mkdirSync(artifacts, { recursive: true });
const destination = path.join(artifacts, 'dungeonbound-debug-x86_64.apk');
copyFileSync(built, destination);
writeFileSync(path.join(artifacts, 'debug-build.json'), JSON.stringify({
  kind: 'local debug APK; requires Metro on port 8082; not an EAS/release build',
  package: appId, abi: 'x86_64', builtAt: new Date().toISOString(),
  sha256: createHash('sha256').update(readFileSync(destination)).digest('hex'),
}, null, 2) + '\n');
console.log('Debug APK saved to artifacts/dungeonbound-debug-x86_64.apk');
if (process.argv.includes('--install')) {
  const adb = path.join(sdk, 'platform-tools/adb.exe');
  run(adb, ['reverse', 'tcp:4000', 'tcp:4000']); run(adb, ['reverse', 'tcp:8082', 'tcp:8082']);
  run(adb, ['install', '-r', destination]);
  run(adb, ['shell', 'am', 'start', '-n', `${appId}/.MainActivity`]);
}
