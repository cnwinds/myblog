#!/bin/bash

# Docker 一键启动脚本

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
ENV_EXAMPLE="$SCRIPT_DIR/.env.example"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

echo "🚀 启动 MyBlog 应用..."

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker"
    exit 1
fi

# 检查是否存在 .env 文件
if [ ! -f "$ENV_FILE" ]; then
    echo "📝 创建环境变量文件..."
    # 直接创建 .env 文件，避免编码问题
    cat > "$ENV_FILE" << 'EOF'
# JWT Secret (Please change in production)
JWT_SECRET=your-secret-key-change-in-production

# Backend Port (default: 3001)
PORT=3001

# Database Path (container path, no need to modify)
DB_PATH=/app/data/blog.db

# Upload Directory (container path, no need to modify)
UPLOAD_DIR=/app/uploads
EOF
    echo "✅ 已创建 .env 文件"
    echo "⚠️  请编辑 $ENV_FILE 文件，修改 JWT_SECRET"
fi

# 构建并启动
echo "🔨 构建镜像..."
docker-compose -f "$COMPOSE_FILE" build

echo "🚀 启动服务..."
docker-compose -f "$COMPOSE_FILE" up -d

echo "⏳ 等待服务启动..."
sleep 5

# 检查服务状态
echo "📊 服务状态："
docker-compose -f "$COMPOSE_FILE" ps

echo ""
echo "✅ 启动完成！"
echo "📱 前端地址: http://localhost"
echo "🔧 后端地址: http://localhost:3001"
echo ""
echo "查看日志: docker-compose -f $COMPOSE_FILE logs -f"
echo "停止服务: docker-compose -f $COMPOSE_FILE down"
