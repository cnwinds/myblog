# 大模型配置和使用指南

## 功能概述

系统已集成大模型配置功能，可以：
1. 配置多个AI提供商（如OpenAI、阿里云、百度等）
2. 分别选择大模型和向量模型提供商
3. 在系统任何地方调用AI能力

## 配置步骤

### 1. 访问设置页面

登录后，点击导航栏的"系统设置"进入配置页面。

### 2. 添加提供商

1. 点击"+ 添加提供商"按钮
2. 填写提供商信息：
   - **名称**：提供商名称（如：openai、bailian等）
   - **类型**：选择大模型、向量模型或两者
   - **API Key**：提供商的API密钥（可选）
   - **API Base URL**：API基础地址（如：https://api.openai.com/v1）
   - **模型列表**：添加该提供商支持的模型名称
   - **启用**：是否启用该提供商

3. 点击"保存"

### 3. 选择使用的提供商

在"提供商选择"部分：
1. 选择大模型提供商和具体模型
2. 选择向量模型提供商和具体模型
3. 点击"保存配置"

## 在代码中使用

### 后端使用

```typescript
import { callLLM, callEmbedding } from './services/aiService';

// 调用大模型生成内容
const response = await callLLM('请写一篇关于AI的文章', {
  temperature: 0.7,
  maxTokens: 2000
});
console.log(response.content);

// 调用向量模型生成嵌入
const embedding = await callEmbedding('这是一段文本');
console.log(embedding.embedding);
```

### 前端使用

```typescript
import api from './services/api';

// 调用大模型
const response = await api.post('/ai/llm', {
  prompt: '请写一篇文章',
  temperature: 0.7,
  maxTokens: 2000
});

// 调用向量模型
const embedding = await api.post('/ai/embedding', {
  text: '这是一段文本'
});
```

## API接口

### 后端API

- `POST /api/ai/llm` - 调用大模型
  - Body: `{ prompt: string, temperature?: number, maxTokens?: number }`
  - 返回: `{ content: string, usage?: {...} }`

- `POST /api/ai/embedding` - 调用向量模型
  - Body: `{ text: string }`
  - 返回: `{ embedding: number[] }`

### 设置API

- `GET /api/settings/providers` - 获取所有提供商
- `POST /api/settings/providers` - 创建提供商
- `PUT /api/settings/providers/:id` - 更新提供商
- `DELETE /api/settings/providers/:id` - 删除提供商
- `GET /api/settings/selection` - 获取当前选择
- `POST /api/settings/selection` - 保存选择

## 使用场景示例

### 1. 文章自动生成

在编辑器页面添加"AI生成"按钮，点击后调用大模型生成文章内容。

### 2. 文章摘要

查看文章列表时，可以调用大模型生成文章摘要。

### 3. 智能搜索

使用向量模型将文章内容转换为向量，实现语义搜索。

### 4. 内容推荐

基于向量相似度推荐相关文章。

## 注意事项

1. 确保已配置至少一个大模型提供商才能使用AI功能
2. API Key需要妥善保管，不要泄露
3. 不同提供商的API格式可能不同，需要根据实际情况调整 `aiService.ts` 中的实现
4. 向量模型主要用于文本嵌入，大模型用于文本生成

## 扩展开发

如需支持新的AI提供商，需要修改 `backend/src/services/aiService.ts` 中的 `callProviderAPI` 和 `callEmbeddingAPI` 函数，根据提供商的API格式实现具体的调用逻辑。
