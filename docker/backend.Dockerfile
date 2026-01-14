# 后端 Dockerfile
# 使用渡渡鸟（docker.aityp.com）提供的华为云镜像加速
FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/node:20-alpine AS builder

WORKDIR /app

# 设置 npm 使用淘宝镜像源加速
RUN npm config set registry https://registry.npmmirror.com

# 设置 apk 使用阿里云镜像源加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装构建工具和图片处理依赖
# better-sqlite3 需要编译原生模块
# sharp 需要 vips-dev 库
RUN apk add \
    python3 \
    make \
    g++ \
    vips-dev

# 复制 package 文件
COPY backend/package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY backend/ ./

# 构建 TypeScript
RUN npm run build

# 生产环境镜像
FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/node:20-alpine

WORKDIR /app

# 设置 npm 使用淘宝镜像源加速
RUN npm config set registry https://registry.npmmirror.com

# 设置 apk 使用阿里云镜像源加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装构建工具和运行时依赖
# better-sqlite3 需要编译原生模块
# sharp 需要 vips 库（运行时也需要）
# tzdata 用于设置时区
RUN apk add \
    python3 \
    make \
    g++ \
    vips \
    vips-dev \
    wget \
    tzdata

# 设置时区为中国时间
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 复制 package 文件
COPY backend/package*.json ./

# 安装生产依赖（better-sqlite3 需要编译）
RUN npm ci --only=production

# 复制构建产物
COPY --from=builder /app/dist ./dist

# 创建上传目录和数据目录
RUN mkdir -p /app/uploads /app/data

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/api/health || exit 1

# 启动命令
CMD ["node", "dist/app.js"]
