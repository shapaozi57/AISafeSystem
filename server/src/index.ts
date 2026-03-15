import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import { loadEnvValue, logEnvKeysForDebug } from './loadEnv';
import { authRouter } from './routes/auth';
import { detectRouter } from './routes/detect';
import { historyRouter } from './routes/history';

const app = express();
const PORT = process.env.PORT || 4000;

logEnvKeysForDebug();
const baiduKey = loadEnvValue('BAIDU_QIANFAN_API_KEY');
console.log('[startup] BAIDU_QIANFAN_API_KEY:', baiduKey ? 'configured' : 'NOT SET (check server/.env)');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/detect', detectRouter);
app.use('/api/history', historyRouter);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

