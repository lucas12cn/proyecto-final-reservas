// La app necesita CAMERA para el escáner de QR. `expo-image-picker` la bloquea del manifiesto
// si `cameraPermission` es false: este chequeo evita que vuelva a desaparecer sin que nadie lo note.
import { readFileSync } from 'node:fs';

const archivo = process.argv[2];
if (!archivo) {
  console.error('Uso: node scripts/verificar-permisos-android.mjs <expo-config.json>');
  process.exit(1);
}

const config = JSON.parse(readFileSync(archivo, 'utf8'));
const permisos =
  config._internal?.modResults?.android?.manifest?.manifest?.['uses-permission'] ?? [];

const camara = permisos.find((p) => p?.$?.['android:name'] === 'android.permission.CAMERA');

if (!camara) {
  console.error(
    'Falta android.permission.CAMERA en el manifiesto: el escáner QR no podría pedir la cámara.',
  );
  process.exit(1);
}

if (camara.$['tools:node'] === 'remove') {
  console.error(
    'android.permission.CAMERA está bloqueada (revisá cameraPermission en app.json).',
  );
  process.exit(1);
}

console.log('android.permission.CAMERA habilitada para el escáner QR.');
