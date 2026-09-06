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
# 编辑 docker/.env，修改 JWT_SECRET；如需助手发布，设置 AGENT_API_KEY

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
- 前端：http://localhost:3000
- 后端 API（经前端网关转发）：http://localhost:3000/api

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
前端开发服务会通过 Vite 代理将 `/api` 和 `/uploads` 请求转发到后端。

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
前端开发服务会通过 Vite 代理将 `/api` 和 `/uploads` 请求转发到后端。

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

5. **实验室**
   - `/lab` 以项目卡片展示（封面、标签、体验 / GitHub）
   - 实验室文章详情页同样提供体验 / 仓库入口
   - 仍使用 `category: 'lab'` 文章，详见 [docs/lab.md](docs/lab.md)

## API接口

### 认证
- `POST /api/auth/login` - 登录
- `POST /api/auth/register` - 注册（已禁用）

### 文章
- `GET /api/articles` - 获取文章列表
- `GET /api/articles/:id` - 获取单篇文章
- `POST /api/articles` - 创建文章（需认证）
- `POST /api/articles/publish` - 助手一键发布（需认证；转存远程图片后创建）
- `PUT /api/articles/:id` - 更新文章（需认证）
- `DELETE /api/articles/:id` - 删除文章（需认证）

### 上传
- `POST /api/upload/image` - 上传图片（需认证）
- `POST /api/upload/from-url` - 将远程图片转存到 `/uploads`（需认证）

## 助手如何发布文章

写作助手不要走浏览器后台。设置 `AGENT_API_KEY` 后，用请求头认证即可，无需 `POST /api/auth/login`。完整约定见 [AGENTS.md](AGENTS.md)。

请求头任选其一：

- `Authorization: Bearer <AGENT_API_KEY>`
- `X-Agent-Key: <AGENT_API_KEY>`

通过 Key 认证的请求归属站点所有者（数据库中 id 最小的用户）。未设置 `AGENT_API_KEY` 时该方式不可用，人类管理员的 JWT 登录不受影响。

```bash
# 可选：先把生成的图片落到本地
curl -sS -X POST https://blog.news-tracker.work/api/upload/from-url \
  -H "Authorization: Bearer $AGENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/generated.png"}'
# 返回 {"url":"/uploads/YYYYWW/image-....jpg"}

# 一键发布（Markdown 里的 http(s) 图片会自动转存；失败的 URL 会留在正文并出现在 imageRewrites.failed）
curl -sS -X POST https://blog.news-tracker.work/api/articles/publish \
  -H "Authorization: Bearer $AGENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "示例标题",
    "content": "正文，可含 ![alt](https://example.com/remote.jpg)",
    "category": "blog",
    "published": true,
    "excerpt": "可选摘要",
    "demoUrl": "https://example.com/play",
    "repoUrl": "https://github.com/example/repo",
    "tags": ["游戏", "AI"]
  }'
```

成功时返回 `{ id, path, url, title, imageRewrites }`。前台文章路径为 `/article/:id`。

## 环境变量

后端需要创建 `.env` 文件：

```
PORT=3001
JWT_SECRET=your-secret-key-change-in-production
DB_PATH=./blog.db
UPLOAD_DIR=./uploads
AGENT_API_KEY=  # 可选；设置后助手可用 Bearer 或 X-Agent-Key 发布，无需登录
```

## 开发说明

1. 首次运行会自动创建数据库和表结构
2. 注册接口已禁用；可用 `backend/scripts/create-user.ts` 创建用户
3. 上传的图片存储在 `backend/uploads` 目录
4. 前端通过代理访问后端API（配置在 `vite.config.ts`）
