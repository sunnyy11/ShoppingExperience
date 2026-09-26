import { createHmac } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(secret: string): Buffer {
  const normalized = secret.replace(/\s+/g, '').toUpperCase();
  const bits: number[] = [];

  for (const char of normalized) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) continue;
    for (let i = 4; i >= 0; i--) {
      bits.push((value >> i) & 1);
    }
  }

  const bytes: number[] = [];
  for (let i = 0; i + 7 < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | (bits[i + j] ?? 0);
    }
    bytes.push(byte);
  }

  return Buffer.from(bytes);
}

export function generateTotp(secret: string, timeStepSeconds = 30, digits = 6): string {
  const key = base32Decode(secret);
  const counter = Buffer.alloc(8);
  let time = Math.floor(Date.now() / 1000 / timeStepSeconds);

  for (let i = 7; i >= 0; i--) {
    counter[i] = time & 0xff;
    time >>= 8;
  }

  const hmac = createHmac('sha1', key).update(counter).digest();
  const offset = hmac.readUInt8(hmac.length - 1) & 0xf;
  let code = hmac.readUInt32BE(offset) & 0x7fffffff;
  code %= 10 ** digits;

  return code.toString().padStart(digits, '0');
}
