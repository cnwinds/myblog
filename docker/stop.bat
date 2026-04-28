@echo off
REM Docker 停止脚本 (Windows)

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

echo 🛑 停止 MyBlog 应用...

%DOCKER_COMPOSE% -f docker\docker-compose.yml down

echo ✅ 服务已停止
echo 📱 前端地址: http://localhost:3000
echo 🔧 API 地址: http://localhost:3000/api
pause
