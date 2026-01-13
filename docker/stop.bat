@echo off
REM Docker 停止脚本 (Windows)

echo 🛑 停止 MyBlog 应用...

docker-compose -f docker\docker-compose.yml down

echo ✅ 服务已停止
pause
