/**
 * 必须在 vite.config 之前执行。Vite 内部用的是 require('crypto')，不是 globalThis.crypto，
 * 所以要给 Node 的 crypto 模块补上 getRandomValues。
 */
const crypto = require('crypto');

function getRandomValues(buffer) {
  const bytes = crypto.randomBytes(buffer.length);
  buffer.set(bytes);
  return buffer;
}

if (typeof crypto.getRandomValues !== 'function') {
  crypto.getRandomValues = getRandomValues;
}
if (crypto.webcrypto && typeof crypto.webcrypto.getRandomValues !== 'function') {
  crypto.webcrypto.getRandomValues = getRandomValues;
}
if (typeof globalThis.crypto === 'undefined' || typeof globalThis.crypto.getRandomValues !== 'function') {
  globalThis.crypto = crypto.webcrypto || { getRandomValues };
}
