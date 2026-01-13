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
