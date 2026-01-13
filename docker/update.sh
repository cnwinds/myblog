#!/bin/bash

# Docker 更新脚本
# 从 git 拉取最新代码，如果有更新则重新构建并重启服务
# 精确管理 myblog 项目的容器，不影响其他 Docker 应用

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

# 项目名称，用于隔离容器
PROJECT_NAME="myblog"

# MyBlog 容器名称列表
MYBLOG_CONTAINERS=("myblog-backend" "myblog-frontend")

# 检测 Docker Compose 命令
if docker compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
elif docker-compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
else
    echo "❌ 未找到 Docker Compose，请先安装 Docker Compose"
    exit 1
fi

echo "🔄 检查代码更新..."
echo "🏷️  项目名称: $PROJECT_NAME"

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

# 检查 MyBlog 服务是否在运行（只检查 myblog 项目的容器）
MYBLOG_RUNNING=false
for container in "${MYBLOG_CONTAINERS[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        MYBLOG_RUNNING=true
        break
    fi
done

if [ "$MYBLOG_RUNNING" = false ]; then
    echo "⚠️  MyBlog 服务未运行，将启动服务..."
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d --build
    echo "✅ 服务已启动"
    exit 0
fi

# 重新构建镜像（只构建 myblog 项目的镜像）
echo "🔨 重新构建 Docker 镜像..."
$DOCKER_COMPOSE -f "$COMPOSE_FILE" -p "$PROJECT_NAME" build --no-cache

# 重启服务（只重启 myblog 项目的容器）
echo "🔄 重启 MyBlog 服务..."
$DOCKER_COMPOSE -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d

echo "⏳ 等待服务启动..."
sleep 5

# 检查服务状态（只显示 myblog 项目的容器）
echo "📊 MyBlog 服务状态："
$DOCKER_COMPOSE -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps

echo ""
echo "✅ 更新完成！"
echo "📱 前端地址: http://localhost:3000"
echo "🔧 后端地址: http://localhost:3001"
