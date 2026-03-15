/**
 * 百度千帆 v2 对话接口（IAM API Key 鉴权）
 * 使用控制台「安全认证 - API Key」创建的 Key。
 * 文档：https://cloud.baidu.com/doc/qianfan-api/s/ym9chdsy5
 */

import { loadEnvValue } from './loadEnv';

const V2_CHAT_URL = 'https://qianfan.baidubce.com/v2/chat/completions';
const DEFAULT_MODEL = 'ernie-3.5-8k';

function getApiKey(): string {
  const key =
    loadEnvValue('BAIDU_QIANFAN_API_KEY') ||
    loadEnvValue('BAIDU_API_KEY') ||
    process.env.BAIDU_QIANFAN_API_KEY ||
    process.env.BAIDU_API_KEY;
  if (!key || !key.trim()) {
    throw new Error('未配置 BAIDU_QIANFAN_API_KEY，请在 server/.env 中填写（控制台-安全认证-API Key 中创建）');
  }
  return key.trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 调用千帆 v2 对话接口，返回模型回复文本
 * 遇到 429 限流时自动重试一次（等待 5 秒）
 */
export async function baiduChat(userContent: string): Promise<string> {
  const apiKey = getApiKey();
  const body = {
    model: loadEnvValue('BAIDU_QIANFAN_MODEL') || process.env.BAIDU_QIANFAN_MODEL || DEFAULT_MODEL,
    messages: [{ role: 'user', content: userContent }],
    temperature: 0.7,
  };

  const doRequest = async (): Promise<Response> => {
    return fetch(V2_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  };

  let res = await doRequest();

  if (res.status === 429) {
    await sleep(5000);
    res = await doRequest();
  }

  const text = await res.text();
  if (!res.ok) {
    let errMsg = `千帆 v2 API 请求失败: ${res.status} ${text}`;
    if (res.status === 429) {
      try {
        const parsed = JSON.parse(text);
        if (parsed?.error?.code === 'tpm_rate_limit_exceeded') {
          errMsg = '请求过于频繁，已触发千帆 TPM 限流，请稍候一至两分钟再试。';
        }
      } catch (_) {}
    }
    throw new Error(errMsg);
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`千帆 API 返回非 JSON: ${text.slice(0, 200)}`);
  }

  if (data.error?.code || data.error?.message) {
    if (data.error?.code === 'tpm_rate_limit_exceeded') {
      throw new Error('请求过于频繁，已触发千帆 TPM 限流，请稍候一至两分钟再试。');
    }
    throw new Error(`千帆 API 错误: ${data.error.code || ''} ${data.error.message || ''}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('千帆 API 返回中无 choices[0].message.content');
  }
  return content.trim();
}

const VOP_ASR_URL = 'https://vop.baidu.com/server_api';

/**
 * 百度短语音识别（与千帆共用 IAM API Key）
 * 文档：https://cloud.baidu.com/doc/qianfan-api/s/mm7viqkmz
 * @param wavBase64 - wav 音频的 base64（16k 采样率、单声道）
 * @param len - 原始 wav 字节长度
 */
export async function baiduAsr(wavBase64: string, len: number): Promise<string> {
  const apiKey = getApiKey();
  const body = {
    format: 'wav',
    rate: 16000,
    channel: 1,
    cuid: 'aisafe_guardian',
    len,
    speech: wavBase64,
  };
  const res = await fetch(VOP_ASR_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`百度 ASR 返回非 JSON: ${text.slice(0, 200)}`);
  }
  if (data.err_no !== 0) {
    throw new Error(`百度 ASR 错误: ${data.err_no} ${data.err_msg || ''}`);
  }
  const result = data.result;
  if (!Array.isArray(result) || result.length === 0) {
    return '';
  }
  return String(result[0]).trim();
}
