# AGENTS

- 文件读取必须使用 UTF-8 编码。

## 助手发布约定

写作助手通过 HTTP API 发布文章，不要使用浏览器后台。人类管理员仍用 JWT 登录后台；助手优先用长期 `AGENT_API_KEY`。

### 认证

- 环境变量 `AGENT_API_KEY`（可选）。未设置时，助手 Key 认证不可用，JWT 登录不受影响。
- 请求头任选其一：
  - `Authorization: Bearer <AGENT_API_KEY>`
  - `X-Agent-Key: <AGENT_API_KEY>`
- 通过 Key 认证的请求视为站点所有者：`users` 表中 **id 最小的用户**（启动时创建的 admin 通常为 1）。
- 不要把 Key 写入日志、文章内容或 git。注册接口保持禁用。

### 一键发布

`POST /api/articles/publish`

```json
{
  "title": "标题",
  "content": "Markdown 正文",
  "category": "blog",
  "published": true,
  "excerpt": "可选摘要",
  "imagePlans": [],
  "demoUrl": "https://example.com/play",
  "repoUrl": "https://github.com/example/repo",
  "tags": ["游戏", "AI"]
}
```

- `category`：`blog` | `lab`，默认 `blog`
- `published`：默认 `true`
- `demoUrl` / `repoUrl` / `tags`：可选；实验室项目用。`tags` 存 JSON 文本，接口返回字符串数组。博客文章可省略。
- 实验室卡片封面取正文第一张 Markdown 图片
- 服务端会下载 Markdown（以及 `imagePlans` 里的 `url` / `imageUrl`）中的远程图片，保存到本地 `/uploads/YYYYWW/`，并把链接改写成 `/uploads/...`
- 已指向本站的地址会跳过：`/uploads/...`、`https://blog.news-tracker.work/uploads/...`
- 单个图片下载失败（超时、非公网、非图片）不会导致整篇发布失败；失败 URL 留在原文，并出现在响应的 `imageRewrites.failed`

成功响应：

```json
{
  "id": 1,
  "path": "/article/1",
  "url": "/article/1",
  "title": "标题",
  "demoUrl": "https://example.com/play",
  "repoUrl": "https://github.com/example/repo",
  "tags": ["游戏", "AI"],
  "imageRewrites": {
    "succeeded": [{ "from": "https://...", "to": "/uploads/202609/image-....jpg" }],
    "failed": [{ "url": "https://...", "reason": "Download timed out" }]
  }
}
```

前台文章地址为 `{path}`，即 `/article/:id`。

### 先转存再写正文（可选）

`POST /api/upload/from-url`，JSON `{ "url": "https://..." }`，返回 `{ "url": "/uploads/..." }`。

本地上传仍可用：`POST /api/upload/image`，multipart 字段 `image`。

### 原有文章 API（仍可用）

- `POST /api/articles`、`PUT /api/articles/:id` 同样会转存远程图片，响应中带 `imageRewrites`
- 人类后台：`POST /api/auth/login` 取得 JWT，再带 `Authorization: Bearer <jwt>`
