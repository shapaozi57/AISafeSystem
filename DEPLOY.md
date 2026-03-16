# 后端部署到 Railway（其他设备可登录/注册）

前端在 Vercel，后端需单独部署。按下面步骤用 **Railway** 部署后端，约 5 分钟。

---

## 1. 注册并创建项目

1. 打开 [railway.app](https://railway.app)，用 GitHub 登录。
2. 点击 **Start a New Project** → **Deploy from GitHub repo**。
3. 选择你的仓库 `shapaozi57/AISafeSystem`（若未列出，先点 **Configure GitHub** 授权）。

---

## 2. 指定后端目录并构建

1. 在项目里选中刚创建的 **Service**（一个方块）。
2. 点 **Settings**（或齿轮图标）。
3. 找到 **Root Directory**：点击 **Set**，填 **`server`**，保存。  
   （这样 Railway 会在 `server/` 下执行 `npm run build` 和 `npm start`。）

---

## 3. 配置环境变量

1. 在同一个 Service 里点 **Variables** 标签。
2. 点击 **+ New Variable** 或 **Add variables from .env**，把下面变量填进去（值从本机 `server/.env` 里复制，不要用示例里的占位符）：

| 变量名 | 说明 |
|--------|------|
| `SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key（在 Supabase 项目 Settings → API） |
| `BAIDU_QIANFAN_API_KEY` | 百度千帆 API Key |

可选：

| 变量名 | 说明 |
|--------|------|
| `PORT` | 一般不填，Railway 会自动注入 |
| `BAIDU_QIANFAN_MODEL` | 默认 `ernie-3.5-8k`，可改 |

---

## 4. 部署并拿到域名

1. 保存后 Railway 会自动重新部署。
2. 点 **Settings** → **Networking** → **Generate Domain**，会得到一个类似 `xxx.railway.app` 的地址。
3. 复制该地址（例如 `https://aisafesystem-server-production-xxxx.up.railway.app`），**不要**末尾斜杠。

---

## 5. 让前端指向后端

1. 打开 **Vercel** 项目 → **Settings** → **Environment Variables**。
2. 新增或修改：
   - **Name**：`VITE_API_URL`
   - **Value**：上一步复制的后端地址（如 `https://xxx.railway.app`）
3. 到 **Deployments** 里点 **Redeploy** 重新部署前端，使新环境变量生效。

---

## 6. 验证

- 在浏览器打开：`你的后端地址/api/health`，应返回 `{"ok":true}`。
- 用手机或别的设备打开你的 Vercel 网站，尝试注册/登录，应能成功。

---

## 常见问题

- **Build 失败**：确认 Root Directory 已设为 `server`，且仓库里包含 `server/package.json` 和 `server/tsconfig.json`。
- **运行时报错 SUPABASE_URL / KEY 未设置**：在 Railway 的 Variables 里再检查变量名是否与上面一致，保存后会自动重新部署。
- **其他设备仍无法登录**：确认 Vercel 已配置 `VITE_API_URL` 并已 Redeploy；用手机直接访问 `https://你的后端地址/api/health` 能打开再试。
