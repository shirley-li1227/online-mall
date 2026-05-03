# online-mall（Mini 在线商城）

一个 **前后端同域部署** 的 Mini 商城示例：

- **前端**：React + TypeScript + Vite + Tailwind
- **后端**：TypeScript + Hono（Cloudflare Workers）
- **数据库**：Cloudflare D1（SQLite 兼容）
- **会话**：Cloudflare KV（HttpOnly Cookie）
- **部署**：Wrangler（Worker 同时托管静态资源 + `/api`）

线上地址（本仓库最近一次部署）：

- `https://online-mall.moningmo.workers.dev`

## 目录结构

- `web/`：前端（构建产物输出到 `web/dist`）
- `worker/`：Worker + API（入口 `worker/src/index.ts`）
- `migrations/`：D1 迁移（建表 + seed 商品）
- `wrangler.toml`：绑定 D1/KV + 静态资源目录（`[assets] directory = "./web/dist"`）

## 本地运行

### 方式 A：同域运行（推荐，和线上一致）

```bash
cd d:\MyProject\online-mall
npm install
npx wrangler d1 migrations apply online-mall-db --local
npm run build -w web
npx wrangler dev --local --port 8787
```

访问：

- 前端：`http://127.0.0.1:8787/`
- API：`http://127.0.0.1:8787/api/health`

### 方式 B：前端热更新（Vite）+ API 走代理

先按方式 A 启动 `wrangler dev`，再开一个终端：

```bash
npm run dev -w web
```

Vite 会输出本地端口（默认 `5173`，若被占用会自动换一个），并将 `/api` 代理到 `http://127.0.0.1:8787`（见 `web/vite.config.ts`）。

## 部署（前后端一起）

### 1）登录

```bash
npx wrangler whoami
# 未登录时：
npx wrangler login
```

### 2）准备 D1 / KV（首次）

```bash
# 创建 D1
npx wrangler d1 create online-mall-db

# 创建 KV
npx wrangler kv namespace create online-mall-sessions
```

把输出的 `database_id` 和 `kv id` 写入 `wrangler.toml`：

- `[[d1_databases]] binding = "DB" ... database_id = "..."`
- `[[kv_namespaces]] binding = "SESSIONS" id = "..."`

### 3）远程迁移

```bash
npx wrangler d1 migrations apply online-mall-db --remote
```

### 4）构建并部署

```bash
npm run deploy
```

部署完成后，Wrangler 会输出 `workers.dev` 访问地址。

## API 概览

所有接口都在同域 `/api` 下（前端使用相对路径调用，并带 `credentials: 'include'`）。

### Auth

- `POST /api/auth/register`：`{ username, email, password }`
- `POST /api/auth/login`：`{ email, password }`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Products

- `GET /api/products`（可选 `?category=...`）
- `GET /api/products/:id`

### Cart（需登录）

- `POST /api/cart`：`{ product_id, quantity }`（若已存在则累加；校验库存）
- `GET /api/cart`：返回购物车列表 + 总价
- `PUT /api/cart/:id`：`{ quantity }`（校验库存）
- `DELETE /api/cart/:id`

### Addresses（需登录）

- `POST /api/addresses`
- `GET /api/addresses`
- `PUT /api/addresses/:id`
- `DELETE /api/addresses/:id`

### Orders（需登录）

- `POST /api/orders`：`{ address_id, cart_item_ids: number[] }`
- `GET /api/orders`（可选 `?status=pending|paid|shipped|completed|cancelled`）
- `GET /api/orders/:id`
- `PUT /api/orders/:id/cancel`（仅待支付可取消；恢复库存）

## 说明

- **会话机制**：登录/注册成功后会设置 `HttpOnly` Cookie，Session 存在 KV（7 天过期）。
- **种子商品**：见 `migrations/0002_seed.sql`，本地/远程迁移后即可在首页看到。

