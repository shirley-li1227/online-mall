

## 任务

做个Mini版商城

实现购物车功能：

添加到购物车（POST /api/cart）：
- 接收 product_id、quantity
- 如果购物车已有该商品，数量累加
- 如果是新商品，创建新记录
- 检查库存是否充足

获取购物车（GET /api/cart）：
- 返回购物车商品列表
- 包含商品详情（名称、价格、图片等）
- 计算总价

更新数量（PUT /api/cart/:id）：
- 更新指定商品的数量
- 检查库存

删除商品（DELETE /api/cart/:id）：
- 从购物车删除指定商品

实现订单功能：

创建订单（POST /api/orders）：
- 接收 address_id 和购物车商品 ID 列表
- 检查库存是否充足
- 计算总价
- 生成订单号（时间戳 + 随机数）
- 创建订单和订单商品记录
- 扣减库存
- 清空购物车中已下单的商品
- 使用数据库事务确保数据一致性

获取订单列表（GET /api/orders）：
- 返回用户的订单列表
- 支持按状态筛选
- 包含订单商品详情

获取订单详情（GET /api/orders/:id）：
- 返回订单详情
- 包含收货地址、订单商品列表

取消订单（PUT /api/orders/:id/cancel）：
- 只能取消待支付的订单
- 恢复库存
- 更新订单状态为已取消

实现地址管理功能：

添加地址（POST /api/addresses）：
- 接收收货人信息
- 如果设置为默认地址，将其他地址的 is_default 设为 false

获取地址列表（GET /api/addresses）：
- 返回用户的地址列表
- 默认地址排在前面

更新地址（PUT /api/addresses/:id）：
- 更新指定地址

删除地址（DELETE /api/addresses/:id）：
- 删除指定地址
- 如果删除的是默认地址，将第一个地址设为默认




## 技术栈

- **前端**：React + TypeScript + Vite，部署到 Cloudflare Pages
- **后端**：TypeScript + Hono 框架，运行在 Cloudflare Workers
- **数据库**：Cloudflare D1（SQLite 兼容）+ KV Storage
- **部署**：Wrangler CLI
- **架构**：全栈 Serverless，零运维，全球 CDN

## 要求

1. 页面需要阅读舒适，使用 UI UX Pro Max 技能美化页面
3. 必须生成完整可运行的代码，每步完成后必须自主测试验证
4. 前后端统一域名部署，使用相对路径 `/api` 调用接口
5. 充分利用 Cloudflare 生态优势：D1 数据库、KV 缓存、Workers 边缘计算
