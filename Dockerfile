FROM node:20-bullseye

# 安装 ffmpeg，用于语音 webm -> wav 转码
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 只复制必要文件，加快构建
COPY server/package.json server/package-lock.json ./server/
COPY server/tsconfig.json ./server/tsconfig.json
COPY server/src ./server/src

WORKDIR /app/server

# 需要 devDependencies 里的 typescript（tsc）来编译
RUN npm ci && npm run build

ENV NODE_ENV=production

# Render / 其他平台会注入 PORT；回退 4000 便于本地测试
ENV PORT=4000

EXPOSE 4000

CMD ["npm", "start"]

