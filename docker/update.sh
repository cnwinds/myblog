#!/bin/bash

# Docker 更新脚本
# 从 git 拉取最新代码，如果有更新则重新构建并重启服务

set -e

echo "🔄 检查代码更新..."

# 保存当前分支
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "当前分支: $CURRENT_BRANCH"

# 获取更新前的 commit hash
OLD_COMMIT=$(git rev-parse HEAD)

# 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin "$CURRENT_BRANCH"

# 获取更新后的 commit hash
NEW_COMMIT=$(git rev-parse HEAD)

# 检查是否有更新
if [ "$OLD_COMMIT" = "$NEW_COMMIT" ]; then
    echo "✅ 代码已是最新版本，无需更新"
    exit 0
fi

echo "✨ 检测到代码更新！"
echo "   旧版本: ${OLD_COMMIT:0:7}"
echo "   新版本: ${NEW_COMMIT:0:7}"

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker"
    exit 1
fi

# 检查服务是否在运行
if ! docker-compose -f docker/docker-compose.yml ps | grep -q "Up"; then
    echo "⚠️  服务未运行，将启动服务..."
    docker-compose -f docker/docker-compose.yml up -d --build
    echo "✅ 服务已启动"
    exit 0
fi

# 重新构建镜像
echo "🔨 重新构建 Docker 镜像..."
docker-compose -f docker/docker-compose.yml build --no-cache

# 重启服务
echo "🔄 重启服务..."
docker-compose -f docker/docker-compose.yml up -d

echo "⏳ 等待服务启动..."
sleep 5

# 检查服务状态
echo "📊 服务状态："
docker-compose -f docker/docker-compose.yml ps

echo ""
echo "✅ 更新完成！"
echo "📱 前端地址: http://localhost"
echo "🔧 后端地址: http://localhost:3001"
