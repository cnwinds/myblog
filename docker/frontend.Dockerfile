# 前端 Dockerfile
# 使用渡渡鸟（docker.aityp.com）提供的华为云镜像加速
FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/node:20-alpine AS builder

WORKDIR /app

# 设置 npm 使用淘宝镜像源加速
RUN npm config set registry https://registry.npmmirror.com

# 设置 apk 使用阿里云镜像源加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 复制 package 文件
COPY frontend/package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY frontend/ ./

# 构建前端
RUN npm run build

# 生产环境镜像 - 使用 nginx 提供静态文件
FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/nginx:alpine

# 设置 apk 使用阿里云镜像源加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装时区数据
RUN apk add --no-cache tzdata

# 设置时区为中国时间
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 复制构建产物到 nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
