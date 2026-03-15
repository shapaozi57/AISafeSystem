import { Router } from 'express';
import { supabase } from '../supabaseClient';
import { baiduChat, baiduAsr } from '../baiduClient';
import { webmBase64ToWavBase64 } from '../webmToWav';

export const detectRouter = Router();

/** 获取当前账号的统计（今日检测次数、帮助同学数） */
detectRouter.get('/stats', async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ error: 'userId 必填' });
  }
  try {
    const stats = await getStats(userId);
    return res.json(stats);
  } catch (err) {
    console.error('Get stats error:', err);
    return res.status(500).json({ error: '获取统计失败' });
  }
});

/** 当天 0 点（服务器本地时区），用于「今日检测次数」 */
function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** 按账号统计：今日检测次数 + 该账号帮助同学数（中/高风险次数） */
async function getStats(userId: string) {
  const todayStart = startOfTodayISO();

  const { count: detectionCount } = await supabase
    .from('history_reports')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', todayStart);

  const { count: studentsHelped } = await supabase
    .from('history_reports')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('risk_level', ['中风险', '高风险']);

  return {
    detectionCount: detectionCount ?? 0,
    studentsHelped: studentsHelped ?? 0
  };
}

detectRouter.post('/text', async (req, res) => {
  const { userId, text } = req.body as { userId: string; text: string };

  if (!userId || !text?.trim()) {
    return res.status(400).json({ error: 'userId 和 text 必填' });
  }

  try {
    const prompt = `你是一个校园安全专家。请分析以下文本是否存在校园欺凌、暴力、自残或其他安全风险。
文本内容: "${text}"

请以JSON格式返回结果，包含以下字段：
- riskLevel: "低风险", "中风险", 或 "高风险"
- suggestion: 针对该内容的具体建议，语气要温和、专业。

只返回JSON，不要其他文字。`;

    const raw = await baiduChat(prompt);
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = {};
        }
      }
    }

    const result = {
      riskLevel: parsed.riskLevel || '低风险',
      suggestion:
        parsed.suggestion ||
        '内容正常，请继续保持友好的交流方式。'
    };

    const { error: insertError } = await supabase.from('history_reports').insert({
      user_id: userId,
      type: '文本',
      content: text,
      risk_level: result.riskLevel,
      suggestion: result.suggestion
    });

    if (insertError) {
      console.error('Insert history error:', insertError);
    }

    const stats = await getStats(userId);

    return res.json({ result, stats });
  } catch (err) {
    console.error('Text detect error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      result: {
        riskLevel: '低风险',
        suggestion: '检测服务暂时不可用，请稍后再试。'
      },
      detail: msg
    });
  }
});

detectRouter.post('/voice', async (req, res) => {
  const { userId, audioBase64 } = req.body as { userId: string; audioBase64?: string };

  if (!userId || !audioBase64) {
    return res.status(400).json({ error: 'userId 和 audioBase64 必填' });
  }

  try {
    const { wavBase64, len } = await webmBase64ToWavBase64(audioBase64);
    const recognizedText = await baiduAsr(wavBase64, len);

    if (!recognizedText) {
      const result = {
        riskLevel: '低风险' as const,
        suggestion: '未能识别出有效语音内容，请靠近麦克风清晰说话后重试。'
      };
      const { error: insertError } = await supabase.from('history_reports').insert({
        user_id: userId,
        type: '语音',
        content: '语音录音检测（未识别到文字）',
        risk_level: result.riskLevel,
        suggestion: result.suggestion
      });
      if (insertError) console.error('Insert history error:', insertError);
      return res.json({ result, stats: await getStats(userId) });
    }

    const prompt = `你是一个校园安全专家。请分析以下由语音识别得到的文本是否存在校园欺凌、暴力、辱骂或其他安全风险。
文本内容: "${recognizedText}"

请以JSON格式返回结果，包含以下字段：
- riskLevel: "低风险", "中风险", 或 "高风险"
- suggestion: 针对该内容的具体建议，语气要温和、专业。

只返回JSON，不要其他文字。`;

    const raw = await baiduChat(prompt);
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = {};
        }
      }
    }

    const result = {
      riskLevel: (parsed.riskLevel || '低风险') as '低风险' | '中风险' | '高风险',
      suggestion: parsed.suggestion || '语音检测未发现明显异常。'
    };

    const { error: insertError } = await supabase.from('history_reports').insert({
      user_id: userId,
      type: '语音',
      content: recognizedText.slice(0, 500),
      risk_level: result.riskLevel,
      suggestion: result.suggestion
    });
    if (insertError) console.error('Insert history error:', insertError);

    const stats = await getStats(userId);
    return res.json({ result, stats });
  } catch (err) {
    console.error('Voice detect error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      result: {
        riskLevel: '低风险',
        suggestion: '语音分析失败，请重试。'
      },
      detail: msg
    });
  }
});

