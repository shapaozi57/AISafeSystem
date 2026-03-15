import { Router } from 'express';
import { supabase } from '../supabaseClient';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const raw = req.body as { username?: string; password?: string };
  const username = typeof raw?.username === 'string' ? raw.username.trim() : '';
  const password = typeof raw?.password === 'string' ? raw.password : '';

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码必填' });
  }
  if (username.length > 64) {
    return res.status(400).json({ error: '用户名过长' });
  }
  if (password.length < 8 || password.length > 16) {
    return res.status(400).json({ error: '密码长度必须在 8 到 16 位之间' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert({ username, password_hash: passwordHash })
      .select('id, username')
      .single();

    if (error) {
      if ((error as any).code === '23505') {
        return res.status(409).json({ error: '用户名已存在' });
      }
      console.error('Supabase register error:', error);
      return res.status(500).json({
        error: '注册失败，请稍后重试',
        detail: (error as any).message || String(error)
      });
    }

    return res.json({ user: data });
  } catch (err) {
    console.error('Register error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      error: '注册失败，请稍后重试',
      detail: message
    });
  }
});

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body as { username: string; password: string };

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码必填' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password_hash')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const ok = await bcrypt.compare(password, (user as any).password_hash);
    if (!ok) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = crypto.randomBytes(16).toString('hex');

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

