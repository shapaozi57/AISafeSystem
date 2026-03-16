/**
 * 从 server/.env 读取环境变量，供各路由使用（不依赖 process.env）
 */
import fs from 'fs';
import path from 'path';

const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
];

function parseEnvFile(envPath: string): Map<string, string> {
  const out = new Map<string, string>();
  const raw = fs.readFileSync(envPath, 'utf-8');
  const rawNoBom = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const lines = rawNoBom.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    let k = trimmed.slice(0, idx).trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
    const v = trimmed.slice(idx + 1).trim();
    if (!k) continue;
    out.set(k, v);
  }
  return out;
}

/** 优先使用 process.env（部署平台注入），其次读 .env 文件 */
export function loadEnvValue(key: string): string | undefined {
  const fromProcess = process.env[key];
  if (fromProcess !== undefined && fromProcess !== '') return fromProcess;
  for (const envPath of possibleEnvPaths) {
    try {
      if (!fs.existsSync(envPath)) continue;
      const parsed = parseEnvFile(envPath);
      const v = parsed.get(key);
      if (v !== undefined) return v;
    } catch (e) {
      console.error('[loadEnv] read error', envPath, e);
    }
  }
  return undefined;
}

// 启动时仅执行一次：打印 .env 路径与能找到的 key 名（便于排查 NOT SET）
let _logged = false;
export function logEnvKeysForDebug(): void {
  if (_logged) return;
  _logged = true;
  console.log('[loadEnv] process.cwd():', process.cwd());
  console.log('[loadEnv] __dirname:', __dirname);
  for (const envPath of possibleEnvPaths) {
    const exists = fs.existsSync(envPath);
    console.log('[loadEnv] path:', envPath, 'exists:', exists);
    if (exists) {
      try {
        const parsed = parseEnvFile(envPath);
        const keys = [...parsed.keys()];
        console.log('[loadEnv] keys in file:', keys.join(', '));
      } catch (e) {
        console.log('[loadEnv] parse error:', e);
      }
    }
  }
}
