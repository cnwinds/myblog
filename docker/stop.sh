#!/bin/bash

# Docker 停止脚本
# 精确管理 myblog 项目的容器，不影响其他 Docker 应用

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

# 项目名称，用于隔离容器
PROJECT_NAME="myblog"

# 检测 Docker Compose 命令
if docker compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
elif docker-compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
else
    echo "❌ 未找到 Docker Compose，请先安装 Docker Compose"
    exit 1
fi

echo "🛑 停止 MyBlog 应用..."
echo "🏷️  项目名称: $PROJECT_NAME"

# 检查容器是否存在
CONTAINERS=("myblog-backend" "myblog-frontend")
RUNNING_CONTAINERS=()

for container in "${CONTAINERS[@]}"; do
    if docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
        RUNNING_CONTAINERS+=("$container")
    fi
done

if [ ${#RUNNING_CONTAINERS[@]} -eq 0 ]; then
    echo "⚠️  未找到运行中的 MyBlog 容器"
    exit 0
fi

# 使用项目名称停止服务（只停止 myblog 项目的容器）
$DOCKER_COMPOSE -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down

echo "✅ MyBlog 服务已停止"
echo "📱 前端地址: http://localhost:3000"
echo "🔧 后端地址: http://localhost:3001"
