# Docker 部署指南

本项目支持使用 Docker 和 Docker Compose 一键部署。

## 前置要求

- Docker >= 20.10
- Docker Compose >= 2.0

## 快速开始

### Windows 用户

1. 双击运行 `docker/start.bat` 脚本

### Linux/Mac 用户

1. 配置环境变量：
```bash
cp docker/.env.example docker/.env
# 编辑 docker/.env，修改 JWT_SECRET
```

2. 运行启动脚本：
```bash
chmod +x docker/start.sh
./docker/start.sh
```

### 手动启动

1. 配置环境变量：
```bash
cp docker/.env.example docker/.env
# 编辑 docker/.env，修改 JWT_SECRET
```

2. 构建并启动服务：
```bash
docker compose -f docker/docker-compose.yml up -d --build
```

### 访问应用

- 前端：http://localhost
- 后端 API：http://localhost:3001

## 常用命令

### 启动服务

```bash
docker compose -f docker/docker-compose.yml up -d
```

### 停止服务

```bash
docker compose -f docker/docker-compose.yml down
```

### 查看日志

```bash
# 查看所有服务日志
docker compose -f docker/docker-compose.yml logs -f

# 查看后端日志
docker compose -f docker/docker-compose.yml logs -f backend

# 查看前端日志
docker compose -f docker/docker-compose.yml logs -f frontend
```

### 重启服务

```bash
docker compose -f docker/docker-compose.yml restart
```

### 重新构建镜像

```bash
docker compose -f docker/docker-compose.yml build --no-cache
```

### 查看服务状态

```bash
docker compose -f docker/docker-compose.yml ps
```

### 更新应用

当代码有更新时，可以使用更新脚本自动拉取代码并重新部署：

**Windows 用户：**
```bash
docker\update.bat
```

**Linux/Mac 用户：**
```bash
chmod +x docker/update.sh
./docker/update.sh
```

更新脚本会自动：
1. 从 git 拉取最新代码
2. 检测是否有更新
3. 如果有更新，重新构建 Docker 镜像
4. 重启服务

如果代码已是最新版本，脚本会跳过构建和重启步骤。

## 数据持久化

项目使用 Docker volumes 来持久化数据：

- `backend-data`: 存储 SQLite 数据库文件
- `backend-uploads`: 存储上传的图片文件

即使删除容器，数据也会保留。要删除所有数据，需要删除 volumes：

```bash
docker compose -f docker/docker-compose.yml down -v
```

## 创建初始用户

如果需要创建初始用户，可以进入后端容器执行：

```bash
# 进入后端容器
docker exec -it myblog-backend sh

# 在容器内执行（需要先安装 tsx）
npm install -g tsx
tsx scripts/create-user.ts
```

或者直接执行：

```bash
docker exec -it myblog-backend sh -c "npm install -g tsx && tsx scripts/create-user.ts"
```

## 故障排查

### 检查容器状态

```bash
docker ps -a
```

### 检查容器日志

```bash
docker logs myblog-backend
docker logs myblog-frontend
```

### 进入容器调试

```bash
# 进入后端容器
docker exec -it myblog-backend sh

# 进入前端容器
docker exec -it myblog-frontend sh
```

## 生产环境建议

1. **修改 JWT_SECRET**：使用强随机字符串
2. **使用 HTTPS**：配置反向代理（如 Nginx）并启用 SSL
3. **配置防火墙**：只开放必要端口
4. **定期备份**：备份 volumes 中的数据
5. **监控日志**：设置日志收集和监控

## 架构说明

- **前端**：使用 Nginx 提供静态文件服务，并代理 API 请求到后端
- **后端**：Node.js Express 应用，使用 SQLite 数据库
- **网络**：使用 Docker bridge 网络连接前后端服务
