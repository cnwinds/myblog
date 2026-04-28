@echo off
REM Docker 一键启动脚本 (Windows)

REM 检测 Docker Compose 命令
docker compose version >nul 2>&1
if errorlevel 1 (
    docker-compose version >nul 2>&1
    if errorlevel 1 (
        echo ❌ 未找到 Docker Compose，请先安装 Docker Compose
        exit /b 1
    ) else (
        set DOCKER_COMPOSE=docker-compose
    )
) else (
    set DOCKER_COMPOSE=docker compose
)

echo 🚀 启动 MyBlog 应用...
echo 📦 使用: %DOCKER_COMPOSE%

REM 检查 Docker 是否运行
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker 未运行，请先启动 Docker
    exit /b 1
)

REM 检查是否存在 .env 文件
if not exist docker\.env (
    echo 📝 创建环境变量文件...
    if exist docker\.env.example (
        copy docker\.env.example docker\.env
    ) else (
        REM 如果 .env.example 不存在，直接创建 .env 文件
        (
            echo # JWT 密钥（生产环境请务必修改）
            echo JWT_SECRET=your-secret-key-change-in-production
            echo.
            echo # 后端端口（默认 3001）
            echo PORT=3001
            echo.
            echo # 数据库路径（容器内路径，无需修改）
            echo DB_PATH=/app/data/blog.db
            echo.
            echo # 上传目录（容器内路径，无需修改）
            echo UPLOAD_DIR=/app/uploads
        ) > docker\.env
    )
    echo ⚠️  请编辑 docker\.env 文件，修改 JWT_SECRET
    pause
)

REM 构建并启动
echo 🔨 构建镜像...
%DOCKER_COMPOSE% -f docker\docker-compose.yml build

echo 🚀 启动服务...
%DOCKER_COMPOSE% -f docker\docker-compose.yml up -d

echo ⏳ 等待服务启动...
timeout /t 5 /nobreak >nul

REM 检查服务状态
echo 📊 服务状态：
%DOCKER_COMPOSE% -f docker\docker-compose.yml ps

echo.
echo ✅ 启动完成！
echo 📱 前端地址: http://localhost:3000
echo 🔧 API 地址: http://localhost:3000/api
echo.
echo 查看日志: %DOCKER_COMPOSE% -f docker\docker-compose.yml logs -f
echo 停止服务: %DOCKER_COMPOSE% -f docker\docker-compose.yml down
pause
