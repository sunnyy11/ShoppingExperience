import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envFilePath = resolve(__dirname, '..', '..', '.env');

if (existsSync(envFilePath) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envFilePath);
}
