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

### 生产环境：拉取 GHCR 镜像

合并到 `main`（或推送 `v*` 标签）后，GitHub Actions 会把镜像推到 GHCR，生产机不必从源码构建：

```bash
cp docker/.env.example docker/.env
# 编辑 docker/.env，修改 JWT_SECRET（不要提交）

cd docker
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

镜像与标签：

- `ghcr.io/cnwinds/myblog-backend:latest` / `:sha-<shortsha>`
- `ghcr.io/cnwinds/myblog-frontend:latest` / `:sha-<shortsha>`
- 若用 git tag 发布，另有与 tag 同名的标签（如 `:v1.0.0`）

数据仍在 Docker 命名卷中（与 migrate 路径一致）：

- `myblog-data` → 容器内 `/app/data`（SQLite）
- `myblog-uploads` → 后端 `/app/uploads`，并挂到前端 `/usr/share/nginx/uploads`

首次启动后若要迁入已有数据，对运行中的后端容器 `docker cp` 即可，例如：

```bash
docker cp ./blog.db myblog-backend:/app/data/blog.db
docker cp ./uploads/. myblog-backend:/app/uploads/
```

不要另做一套备份方案。`docker compose ... down` 会保留命名卷；加 `-v` 才会删数据。

公开仓库首次推送后，GitHub Packages 上的包默认可能是 Private。若生产机 `docker pull` 返回 401，把 `myblog-backend` / `myblog-frontend` 设为 Public，或：

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u USERNAME --password-stdin
```

### 访问应用

- 前端：http://localhost:3000
- 后端 API（经前端网关转发）：http://localhost:3000/api

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

本地源码构建（`docker-compose.yml`）使用绑定目录：

- `docker/backend-data`：SQLite
- `docker/backend-uploads`：上传图片

生产拉取镜像（`docker-compose.prod.yml`）使用命名卷：

- `myblog-data` → `/app/data`
- `myblog-uploads` → `/app/uploads`（前端同时挂到 `/usr/share/nginx/uploads`）

即使删除容器，数据也会保留。要删除所有数据，需要删除 volumes：

```bash
docker compose -f docker/docker-compose.yml down -v
docker compose -f docker/docker-compose.prod.yml down -v
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
2. **如需助手发布**：设置 `AGENT_API_KEY` 为足够长的随机字符串，不要提交到 git
3. **使用 HTTPS**：配置反向代理（如 Nginx）并启用 SSL
4. **配置防火墙**：只开放必要端口
5. **定期备份**：备份 volumes 中的数据
6. **监控日志**：设置日志收集和监控

## 架构说明

- **前端**：使用 Nginx 提供静态文件服务，并代理 API 请求到后端
- **后端**：Node.js Express 应用，使用 SQLite 数据库
- **网络**：使用 Docker bridge 网络连接前后端服务
