# 我的博客

一个前后端分离的博客系统，支持用户登录、Markdown编辑器、文章发布和图片上传功能。

## 技术栈

### 后端
- Node.js + Express + TypeScript
- SQLite (better-sqlite3)
- JWT 认证
- Multer 文件上传

### 前端
- React + TypeScript
- Vite
- React Router
- @uiw/react-md-editor (Markdown编辑器)
- React Markdown (Markdown渲染)

## 快速开始

### 方式一：Docker 部署（推荐）

使用 Docker Compose 一键部署：

```bash
# 1. 配置环境变量
cp docker/.env.example docker/.env
# 编辑 docker/.env，修改 JWT_SECRET

# 2. 启动服务
docker compose -f docker/docker-compose.yml up -d --build

# 或使用启动脚本（Linux/Mac）
chmod +x docker/start.sh
./docker/start.sh
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
```

访问应用：
- 前端：http://localhost
- 后端 API：http://localhost:3001

详细说明请查看 [docker/README.md](docker/README.md)

### 方式二：本地开发

#### 后端

```bash
cd backend
npm install
npm run dev
```

后端服务运行在 http://localhost:3001

#### 前端

```bash
cd frontend
npm install
npm run dev
```

前端服务运行在 http://localhost:3000

## 项目结构

```
myblog/
├── backend/          # 后端项目
│   ├── src/
│   │   ├── routes/   # 路由
│   │   ├── controllers/  # 控制器
│   │   ├── models/   # 数据模型
│   │   ├── middleware/   # 中间件
│   │   └── utils/    # 工具函数
├── docker/           # Docker 配置文件
│   ├── docker-compose.yml  # 生产环境配置
│   ├── docker-compose.dev.yml  # 开发环境配置
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   └── nginx.conf
│   └── uploads/      # 图片上传目录
└── frontend/         # 前端项目
    └── src/
        ├── components/   # 组件
        ├── pages/        # 页面
        ├── services/     # API服务
        └── hooks/        # React Hooks
```

## 安装和运行

### 后端

```bash
cd backend
npm install
npm run dev
```

后端服务将在 http://localhost:3001 运行

### 前端

```bash
cd frontend
npm install
npm run dev
```

前端应用将在 http://localhost:3000 运行

## 功能特性

1. **用户认证**
   - 用户注册和登录
   - JWT Token 认证
   - 密码加密存储

2. **文章管理**
   - 创建、编辑、删除文章
   - 文章列表展示
   - 文章详情查看

3. **Markdown编辑器**
   - 实时预览
   - 语法高亮
   - 工具栏支持

4. **图片上传**
   - 支持本地图片上传
   - 支持图片URL输入
   - 自动插入Markdown语法

## API接口

### 认证
- `POST /api/auth/login` - 登录
- `POST /api/auth/register` - 注册

### 文章
- `GET /api/articles` - 获取文章列表
- `GET /api/articles/:id` - 获取单篇文章
- `POST /api/articles` - 创建文章（需认证）
- `PUT /api/articles/:id` - 更新文章（需认证）
- `DELETE /api/articles/:id` - 删除文章（需认证）

### 上传
- `POST /api/upload/image` - 上传图片（需认证）

## 环境变量

后端需要创建 `.env` 文件：

```
PORT=3001
JWT_SECRET=your-secret-key-change-in-production
DB_PATH=./blog.db
UPLOAD_DIR=./uploads
```

## 开发说明

1. 首次运行会自动创建数据库和表结构
2. 可以通过注册接口创建新用户
3. 上传的图片存储在 `backend/uploads` 目录
4. 前端通过代理访问后端API（配置在 `vite.config.ts`）
