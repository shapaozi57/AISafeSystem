import { Router } from 'express';
import { supabase } from '../supabaseClient';

export const historyRouter = Router();

historyRouter.get('/', async (req, res) => {
  const userId = req.query.userId as string;
  const riskLevel = req.query.riskLevel as string | undefined;

  if (!userId) {
    return res.status(400).json({ error: 'userId 必填' });
  }

  try {
    let query = supabase
      .from('history_reports')
      .select('id, type, content, risk_level, suggestion, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (riskLevel && riskLevel !== '全部') {
      query = query.eq('risk_level', riskLevel);
    }

    const { data, error } = await query;

    if (error) throw error;

    const reports = (data || []).map((r) => ({
      id: r.id,
      timestamp: new Date(r.created_at as string).toLocaleString(),
      type: r.type as '文本' | '语音',
      content: r.content as string,
      result: {
        riskLevel: r.risk_level as '低风险' | '中风险' | '高风险',
        suggestion: r.suggestion as string
      }
    }));

    return res.json({ reports });
  } catch (err) {
    console.error('Get history error:', err);
    return res.status(500).json({ error: '获取历史记录失败' });
  }
});

historyRouter.delete('/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const { error } = await supabase.from('history_reports').delete().eq('id', id);
    if (error) throw error;
    return res.json({ ok: true });
  } catch (err) {
    console.error('Delete history error:', err);
    return res.status(500).json({ error: '删除失败' });
  }
});

