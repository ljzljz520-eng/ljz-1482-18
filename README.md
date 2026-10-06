# 云溪创作工作台：导航授权与版本恢复

一个容器化全栈示例，演示创作工作台在深链接、项目成员权限、旧节点迁移、本地草稿恢复、保存冲突和历史快照之间如何保持一致。

## 🛠 技术栈

- Frontend: React 18 + TypeScript + Vite + Tailwind CSS + Zustand + React Router
- Backend: Node.js 20 + Express + Zod + JWT + Pino
- Database: PostgreSQL 16 + Prisma ORM
- Deployment: Docker Compose / Nginx reverse proxy

## 🚀 启动指南

1. 确保 Docker Desktop 或 Docker Engine 已启动。
2. 在仓库根目录执行：

```bash
docker compose up --build
```

3. 等待数据库迁移与种子数据执行完成。
4. 访问：

- Frontend: http://localhost:3000
- Backend Health: http://localhost:3001/health
- API Base through Nginx: http://localhost:3000/api/health

## 🔗 服务地址

| 服务 | 地址 |
|---|---|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:3001 |
| PostgreSQL | localhost:5432 |
| Database | `creative_workbench` |
| DB User / Password | `workbench` / `workbench_pwd` |

## 🧪 测试账号

所有账号密码均为：`123456`。演示环境 JWT 有效期设置为 120 秒，便于验收会话过期；可在 docker-compose.yml 中调整。

| 账号 | 用途 |
|---|---|
| `admin@example.com` | 项目管理员，可迁移旧节点、删除资源 |
| `lin@example.com` | 编辑，可修改脚本和素材 |
| `wang@example.com` | 只读审阅，可查看但不能写入 |

## 深链接示例

登录后可直接打开：

- 项目：`http://localhost:3000/w/prj-lantern-festival`
- 场次：`http://localhost:3000/w/prj-lantern-festival/sessions/ses-opening-river?step=script`
- 素材：`http://localhost:3000/w/prj-lantern-festival/assets/ast-river-keyvisual`
- 旧节点迁移：`http://localhost:3000/w/prj-legacy-node`
- 退役项目：`http://localhost:3000/w/prj-retired-archive`
- 历史导出快照：`http://localhost:3000/w/prj-lantern-festival/exports/exp-lantern-v2-review`
- 非法深链接：`http://localhost:3000/w/prj-x/sessions/ses-opening-river`

## 核心安全与一致性规则

1. **路由守卫只负责体验**：前端守卫检查 token、保留 `returnTo` 和展示登录页，不代表资源授权。
2. **所有接口重新校验**：后端每个读写接口都验证 JWT、Membership、项目状态以及场次/素材/快照的 `projectId`。
3. **猜 ID 不能越权**：无项目成员关系时返回 404，不暴露项目或资源存在性。
4. **先验证访问，再恢复本地草稿**：权限、资源归属、删除状态和项目版本通过前，不渲染本地脚本。
5. **软删除持久化**：场次和素材使用 `deletedAt`，普通列表/详情不返回已删资源。
6. **旧节点迁移有审计记录**：迁移在事务中更新 Project 模块版本，并创建 ModuleMigration。
7. **保存版本乐观锁**：前端提交 `expectedVersion`，不一致时后端返回 409 和服务器新稿，绝不自动覆盖。
8. **异步导航代次隔离**：快速切换项目时旧请求会被 Abort 或按代次/资源键丢弃，避免甲项目脚本写入乙页面。
9. **导出快照不可变**：`exp-*` 链接始终读取冻结内容，不会跳转到当前最新草稿。

## 保存状态说明

- **已提交 committed**：服务器已创建新的 ScriptVersion，本地草稿清除。
- **待同步 pending**：保存请求已发出但响应未确认；此时离开会触发浏览器提示，并把草稿封存到本地。
- **冲突 conflict**：服务器已有其他成员的新稿，只允许人工使用服务器稿或生成合并副本。

## 主要文档

- [恢复顺序与等待体验](docs/recovery-strategy.md)
- [验收场景矩阵](docs/acceptance.md)

## 本地开发（非 Docker）

后端：

```bash
cd backend
npm install
DATABASE_URL="postgresql://workbench:workbench_pwd@localhost:5432/creative_workbench?schema=public" \
JWT_SECRET="dev-secret" npm run dev
```

前端：

```bash
cd frontend
npm install
npm run dev
```

Vite 已将 `/api` 代理到 `http://localhost:3001`。
