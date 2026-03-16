# 后端部署（带语音）到 Render（推荐）

前端在 Vercel，后端需单独部署。为支持 **ffmpeg 语音转码**，这里推荐用 **Render + Dockerfile** 部署后端。

> 如果你已经按 Railway 部署过，可以把 Railway 服务停用/删除，改用 Render 即可。

---

## 1. 注册并创建 Web Service

1. 打开 [render.com](https://render.com)，用 GitHub 登录。
2. 点击 **New +** → **Web Service**。
3. 选择你的仓库 `shapaozi57/AISafeSystem`（若未列出，先在 Render 设置里授权 GitHub）。

---

## 2. 选择 Docker 构建

在创建 Web Service 的向导里：

1. **Environment** 选择 `Docker`。
2. Render 会自动检测到仓库根目录的 `Dockerfile`，保持默认即可。
3. **Name** 可自定义一个名字，例如 `aisafesystem-server`。
4. 其他选项保持默认，点击 **Create Web Service**。

---

## 3. 配置环境变量

1. 在该 Web Service 页面顶部，点 **Environment**。
2. 在 **Environment Variables** 区域点击 **+ Add Environment Variable**，把下面变量填进去（值从本机 `server/.env` 里复制，不要用示例里的占位符）：

| 变量名 | 说明 |
|--------|------|
| `SUPABASE_URL` | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key（在 Supabase 项目 Settings → API） |
| `BAIDU_QIANFAN_API_KEY` | 百度千帆 API Key |

可选：

| 变量名 | 说明 |
|--------|------|
| `PORT` | 通常不需要手动设置，Render 会注入 `PORT`，代码会优先使用它 |
| `BAIDU_QIANFAN_MODEL` | 默认 `ernie-3.5-8k`，可改 |

---

## 4. 部署并拿到域名

1. 填完环境变量后，Render 会自动触发一次构建（Build）和启动（Deploy）。
2. 在该 Web Service 顶部可以看到一个生成的 URL，例如 `https://aisafesystem-server.onrender.com`。
3. 复制该地址（例如 `https://aisafesystem-server.onrender.com`），**不要**末尾斜杠。

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

- **Build 失败**：查看 Render 的 **Events / Logs**，确认 `Dockerfile` 在仓库根目录，且能成功 `npm ci` 与 `npm run build`。
- **运行时报错 SUPABASE_URL / KEY 未设置**：在 Render 的 Environment Variables 里再检查变量名是否与上面一致，保存后会自动重新部署。
- **其他设备仍无法登录**：确认 Vercel 已配置 `VITE_API_URL` 并已 Redeploy；用手机直接访问 `https://你的后端地址/api/health` 能打开再试。
