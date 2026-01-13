# 后端 Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY backend/package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY backend/ ./

# 构建 TypeScript
RUN npm run build

# 生产环境镜像
FROM node:20-alpine

WORKDIR /app

# 安装生产依赖
COPY backend/package*.json ./
RUN npm ci --only=production

# 复制构建产物
COPY --from=builder /app/dist ./dist

# 创建上传目录和数据目录
RUN mkdir -p /app/uploads /app/data

# 暴露端口
EXPOSE 3001

# 安装 wget 用于健康检查
RUN apk add --no-cache wget

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/api/health || exit 1

# 启动命令
CMD ["node", "dist/app.js"]
