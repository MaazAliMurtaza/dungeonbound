// Deterministic QR from Expo's own encoder; no image-generation service.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { writeFileSync } from 'node:fs';
const root = fileURLToPath(new URL('../', import.meta.url));
const mobileRequire = createRequire(new URL('../mobile/package.json', import.meta.url));
const expoRequire = createRequire(mobileRequire.resolve('expo/package.json'));
const cliRequire = createRequire(expoRequire.resolve('@expo/cli/package.json'));
const { toQR } = cliRequire('toqr');
const { PNG } = mobileRequire('pngjs');
const host = process.argv[2] || '127.0.0.1';
const octets = host.split('.');
if (octets.length !== 4 || octets.some(part => !/^\d{1,3}$/.test(part) || Number(part) > 255) ||
  !(host === '127.0.0.1' || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host))) {
  throw new Error('Use localhost or the PC private-network IPv4 address.');
}
const url = `exp://${host}:8082`;
const filename = host === '127.0.0.1' ? 'phone-qr-usb.png' : 'phone-qr-wifi.png';
const matrix = toQR(url), modules = Math.sqrt(matrix.length);
if (!Number.isInteger(modules)) throw new Error('Invalid QR encoder result');
const scale = 12, quiet = 4, side = (modules + quiet * 2) * scale;
const png = new PNG({ width: side, height: side });
for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
  const row = Math.floor(y / scale) - quiet, col = Math.floor(x / scale) - quiet;
  const dark = row >= 0 && col >= 0 && row < modules && col < modules && matrix[row * modules + col];
  const offset = (y * side + x) * 4;
  png.data[offset] = png.data[offset + 1] = png.data[offset + 2] = dark ? 0 : 255;
  png.data[offset + 3] = 255;
}
writeFileSync(path.join(root, filename), PNG.sync.write(png));
console.log(`Phone QR saved: ${filename} (${url})`);
