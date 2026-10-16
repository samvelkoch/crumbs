// Зашифрованный бэкап: файл можно хранить где угодно (облако, мессенджер),
// без пароля семьи его не прочитать. Шифрование AES-GCM, ключ из пароля через PBKDF2.
const FORMAT = 'crumbs-backup';
const ITER = 250000;

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function unb64(str) {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(password, salt, iter) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

export async function encryptState(state, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ITER);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(state)));
  return JSON.stringify({ format: FORMAT, v: 1, kdf: 'PBKDF2-SHA256', iter: ITER, salt: b64(salt), iv: b64(iv), data: b64(data), createdAt: new Date().toISOString() });
}

export class BackupError extends Error {}

export async function decryptBackup(text, password) {
  let pkg;
  try {
    pkg = JSON.parse(text);
  } catch {
    throw new BackupError('Это не файл бэкапа');
  }
  if (pkg?.format !== FORMAT) throw new BackupError('Это не файл бэкапа');
  try {
    const key = await deriveKey(password, unb64(pkg.salt), pkg.iter || ITER);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(pkg.iv) }, key, unb64(pkg.data));
    return JSON.parse(dec.decode(plain));
  } catch {
    throw new BackupError('Пароль не подходит');
  }
}
