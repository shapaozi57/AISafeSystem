# AI 校园安全小卫士

面向校园场景的文本/语音内容安全检测、安全知识问答与知识竞赛练习。前端为 React + Vite，后端为 Node + Express，数据存储在 Supabase，大模型与语音识别使用百度千帆。

## 技术栈

| 部分 | 说明 |
|------|------|
| 前端 | React 19、Vite 6、Tailwind（CDN）、Motion |
| 后端 | Express、TypeScript、Supabase JS、百度千帆 v2 |
| 数据 | Supabase（用户、检测与问答历史） |
| 部署 | 前端 [Vercel](https://vercel.com)，后端 [Render](https://render.com)（Docker 含 ffmpeg，支持语音转码） |

## 仓库结构

```
├── src/                 # 前端源码（App.tsx 为主入口）
├── server/              # 后端源码（Express API）
├── Dockerfile           # Render 构建镜像（含 ffmpeg）
├── DEPLOY.md            # 生产环境部署步骤与排错
├── DEMO_AND_CONTEST.md  # 演示脚本与比赛材料要点
└── package.json         # 前端依赖与脚本
```

## 本地运行

### 前置条件

- Node.js 18+（推荐 20+，与 Supabase 客户端引擎要求一致）
- 本地开发语音检测需安装 **ffmpeg** 并加入 PATH

### 1. 前端

```bash
npm install
npm run dev
```

默认开发地址：`http://localhost:3000`（见 `package.json` 中 `dev` 脚本）。

### 2. 后端

```bash
cd server
npm install
npm run dev
```

默认监听：`http://localhost:4000`。

复制 `server/.env.example` 为 `server/.env`，填写：

- `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`
- `BAIDU_QIANFAN_API_KEY`（可选 `BAIDU_QIANFAN_MODEL`）

### 3. 前端连接本地后端

在项目根目录创建 `.env`（可参考 `.env.example`）：

```env
VITE_API_URL=http://localhost:4000
```

然后重新执行 `npm run dev`。

## 生产部署

完整步骤（Render 后端 + Vercel 前端 + 环境变量 + 验证）见 **[DEPLOY.md](./DEPLOY.md)**。

部署完成后务必在 Vercel 设置 **`VITE_API_URL`** 为后端 HTTPS 地址，并 **Redeploy** 一次前端。

## 演示脚本（答辩 / 验收）

按顺序操作即可覆盖主要功能，详见 **[DEMO_AND_CONTEST.md](./DEMO_AND_CONTEST.md)** 中的「固定演示流程」。

## 常见问题（FAQ）

| 现象 | 处理 |
|------|------|
| 登录提示「无法连接服务器」 | 确认后端已启动；线上检查 Vercel 的 `VITE_API_URL` 是否为后端公网地址并已 Redeploy。 |
| 注册失败且含 `ENOTFOUND ...supabase.co` | Supabase 项目 URL 错误或项目已删除，到 Supabase 控制台复制最新 **Project URL** 更新 `server/.env` 与线上环境变量。 |
| 语音分析提示未找到 ffmpeg | 本地安装 ffmpeg；线上需使用带 Dockerfile 的 Render 部署（见 DEPLOY.md）。 |
| 千帆限流 / 429 | 稍等 1～2 分钟再试；检查百度控制台配额。 |
| 手机访问电脑局域网前端无法登录 | 手机上的 `localhost` 指向手机本身；请把 `VITE_API_URL` 设为电脑的局域网 IP（如 `http://192.168.x.x:4000`）并重启前端。 |

## 许可证

见各文件头部 SPDX 声明（如 Apache-2.0）。
