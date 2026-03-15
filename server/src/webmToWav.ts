/**
 * 将 webm 音频转为 16k 单声道 wav，供百度 ASR 使用
 * 使用系统已安装的 ffmpeg（PATH 中的 ffmpeg），无需 npm 下载二进制
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

export function webmBase64ToWavBase64(webmBase64: string): Promise<{ wavBase64: string; len: number }> {
  return new Promise((resolve, reject) => {
    const tmpDir = os.tmpdir();
    const prefix = `aisafe_${Date.now()}_`;
    const webmPath = path.join(tmpDir, `${prefix}in.webm`);
    const wavPath = path.join(tmpDir, `${prefix}out.wav`);
    const buf = Buffer.from(webmBase64, 'base64');
    fs.writeFileSync(webmPath, buf);

    const cleanup = () => {
      try {
        if (fs.existsSync(webmPath)) fs.unlinkSync(webmPath);
        if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
      } catch (_) {}
    };

    const proc = spawn('ffmpeg', [
      '-y',
      '-i', webmPath,
      '-ar', '16000',
      '-ac', '1',
      '-f', 'wav',
      wavPath
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    const stderr: string[] = [];
    proc.stderr?.on('data', (chunk) => stderr.push(chunk.toString()));

    proc.on('close', (code, signal) => {
      if (code !== 0) {
        cleanup();
        const msg = signal ? `ffmpeg 被终止 (${signal})` : `ffmpeg 退出码 ${code}`;
        const errText = stderr.join('').slice(-400);
        reject(new Error(`${msg}${errText ? ': ' + errText : ''}`));
        return;
      }
      try {
        const wavBuf = fs.readFileSync(wavPath);
        const wavBase64 = wavBuf.toString('base64');
        cleanup();
        resolve({ wavBase64, len: wavBuf.length });
      } catch (e) {
        cleanup();
        reject(e);
      }
    });

    proc.on('error', (err: NodeJS.ErrnoException) => {
      cleanup();
      if (err.code === 'ENOENT') {
        reject(new Error('未找到 ffmpeg。请先安装 ffmpeg 并加入系统 PATH，或使用「文本内容检测」。'));
      } else {
        reject(err);
      }
    });
  });
}
