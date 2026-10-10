# Bug 诗人（Bug Poet）

把枯燥的程序报错变成一首格式合规的中文诗，附赠"凄美指数"，用古风排版展示。

## 技术栈

- **前端**：React + TypeScript + Vite
- **后端**：Node.js + Express + TypeScript
- **LLM**：OpenAI-compatible API（默认 gpt-4o-mini）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env`，填入你的 API Key：

```
OPENAI_API_KEY=your-actual-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
PORT=3001
MODEL_NAME=gpt-4o-mini
```

### 3. 启动开发服务器

```bash
npm run dev
```

前端运行在 http://localhost:5173，后端运行在 http://localhost:3001。

## 构建

```bash
npm run build
```

构建产物：
- `backend/dist/` — 编译后的 Node.js 服务
- `frontend/dist/` — 静态前端文件

## 注意事项

- **API Key 只在后端使用**，绝不出现在前端代码中
- 报错内容仅用于本次生成，不持久化到服务器
- 后端对同一 IP 限流：每分钟最多 10 次请求
