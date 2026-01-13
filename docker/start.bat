@echo off
REM Docker 一键启动脚本 (Windows)

echo 🚀 启动 MyBlog 应用...

REM 检查 Docker 是否运行
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker 未运行，请先启动 Docker
    exit /b 1
)

REM 检查是否存在 .env 文件
if not exist docker\.env (
    echo 📝 创建环境变量文件...
    copy docker\.env.example docker\.env
    echo ⚠️  请编辑 docker\.env 文件，修改 JWT_SECRET
    pause
)

REM 构建并启动
echo 🔨 构建镜像...
docker-compose -f docker\docker-compose.yml build

echo 🚀 启动服务...
docker-compose -f docker\docker-compose.yml up -d

echo ⏳ 等待服务启动...
timeout /t 5 /nobreak >nul

REM 检查服务状态
echo 📊 服务状态：
docker-compose -f docker\docker-compose.yml ps

echo.
echo ✅ 启动完成！
echo 📱 前端地址: http://localhost
echo 🔧 后端地址: http://localhost:3001
echo.
echo 查看日志: docker-compose -f docker\docker-compose.yml logs -f
echo 停止服务: docker-compose -f docker\docker-compose.yml down
pause
