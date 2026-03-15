import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fetch as crossFetch, Headers as CrossHeaders, Request as CrossRequest, Response as CrossResponse } from 'cross-fetch';

// 调试辅助：打印当前工作目录和 .env 搜索路径
const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env')
];
console.log('[supabaseClient] process.cwd():', process.cwd());
console.log('[supabaseClient] __dirname:', __dirname);
console.log(
  '[supabaseClient] possible .env paths:',
  possibleEnvPaths.map(p => `${p} (exists=${fs.existsSync(p)})`)
);

function loadEnvValue(key: string): string | undefined {
  for (const envPath of possibleEnvPaths) {
    try {
      if (!fs.existsSync(envPath)) continue;
      const raw = fs.readFileSync(envPath, 'utf-8');
      const lines = raw.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx === -1) continue;
        let k = trimmed.slice(0, idx).trim();
        // 去掉可能存在的 UTF-8 BOM
        if (k.charCodeAt(0) === 0xfeff) {
          k = k.slice(1);
        }
        const v = trimmed.slice(idx + 1).trim();
        if (k === key) {
          return v;
        }
      }
    } catch (e) {
      console.error('[supabaseClient] error reading env file', envPath, e);
    }
  }
  return undefined;
}

// 确保在 Node.js 环境下存在 fetch / Headers 等全局对象，供 supabase-js 使用
if (typeof (globalThis as any).fetch === 'undefined') {
  (globalThis as any).fetch = crossFetch as any;
}
if (typeof (globalThis as any).Headers === 'undefined') {
  (globalThis as any).Headers = CrossHeaders as any;
}
if (typeof (globalThis as any).Request === 'undefined') {
  (globalThis as any).Request = CrossRequest as any;
}
if (typeof (globalThis as any).Response === 'undefined') {
  (globalThis as any).Response = CrossResponse as any;
}

// 优先使用 .env 文件中的值，只有没有时才退回到进程环境变量
const fileSupabaseUrl = loadEnvValue('SUPABASE_URL');
const fileServiceKey = loadEnvValue('SUPABASE_SERVICE_ROLE_KEY');

const supabaseUrl = fileSupabaseUrl || process.env.SUPABASE_URL;
const supabaseKey = fileServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('[supabaseClient] loaded SUPABASE_URL:', supabaseUrl);
console.log(
  '[supabaseClient] loaded SUPABASE_SERVICE_ROLE_KEY length:',
  supabaseKey ? supabaseKey.length : 'undefined'
);

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});



