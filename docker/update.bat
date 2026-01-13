@echo off
REM Docker 更新脚本 (Windows)
REM 从 git 拉取最新代码，如果有更新则重新构建并重启服务

echo 🔄 检查代码更新...

REM 检查是否在 git 仓库中
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo ❌ 当前目录不是 git 仓库
    exit /b 1
)

REM 保存当前分支
for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set CURRENT_BRANCH=%%i
echo 当前分支: %CURRENT_BRANCH%

REM 获取更新前的 commit hash
for /f "tokens=*" %%i in ('git rev-parse HEAD') do set OLD_COMMIT=%%i

REM 拉取最新代码
echo 📥 拉取最新代码...
git pull origin %CURRENT_BRANCH%
if errorlevel 1 (
    echo ❌ Git pull 失败
    exit /b 1
)

REM 获取更新后的 commit hash
for /f "tokens=*" %%i in ('git rev-parse HEAD') do set NEW_COMMIT=%%i

REM 检查是否有更新
if "%OLD_COMMIT%"=="%NEW_COMMIT%" (
    echo ✅ 代码已是最新版本，无需更新
    exit /b 0
)

echo ✨ 检测到代码更新！
echo    旧版本: %OLD_COMMIT:~0,7%
echo    新版本: %NEW_COMMIT:~0,7%

REM 检查 Docker 是否运行
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker 未运行，请先启动 Docker
    exit /b 1
)

REM 检查服务是否在运行
docker-compose -f docker\docker-compose.yml ps | findstr "Up" >nul
if errorlevel 1 (
    echo ⚠️  服务未运行，将启动服务...
    docker-compose -f docker\docker-compose.yml up -d --build
    echo ✅ 服务已启动
    exit /b 0
)

REM 重新构建镜像
echo 🔨 重新构建 Docker 镜像...
docker-compose -f docker\docker-compose.yml build --no-cache
if errorlevel 1 (
    echo ❌ 构建失败
    exit /b 1
)

REM 重启服务
echo 🔄 重启服务...
docker-compose -f docker\docker-compose.yml up -d
if errorlevel 1 (
    echo ❌ 重启失败
    exit /b 1
)

echo ⏳ 等待服务启动...
timeout /t 5 /nobreak >nul

REM 检查服务状态
echo 📊 服务状态：
docker-compose -f docker\docker-compose.yml ps

echo.
echo ✅ 更新完成！
echo 📱 前端地址: http://localhost
echo 🔧 后端地址: http://localhost:3001
pause
