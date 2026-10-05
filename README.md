# 云溪创作工作台（Creation Workbench）

面向多场次直播 / 演艺活动的**脚本与素材协作工作台**：Web 深链接可直达「项目 → 场次（定位到具体步骤）/ 素材」，
后端按**项目成员身份**为每一个读写接口鉴权；本地草稿「先验证访问、后恢复」；异步导航按**目标代次**隔离；
保存与离开竞争区分**已提交 / 待同步 / 冲突**；历史导出链接永远停在它的不可变快照。

> 安全基线：**路由守卫只负责体验，所有读写接口仍在后端校验资源所属项目；猜到 ID 不能绕过权限。**

## 🛠 技术栈

- **Frontend**：React 18 + TypeScript 5.7 + Vite 6 + Tailwind CSS 3.4 + Zustand 5 + React Router 7 + Axios + Zod + react-hot-toast
- **Backend**：Node.js 20 + Express 4 + TypeScript（tsx 运行）+ Prisma 5 + Zod + JWT(jsonwebtoken) + bcryptjs + winston
- **Database**：PostgreSQL 16（Docker Volume 持久化）

## 🚀 启动指南（一键）

1. 确保 Docker Desktop / Docker Engine 已启动。
2. 在仓库根目录执行：
   ```bash
   docker compose up --build
   ```
   首次启动会自动：等待数据库就绪 → `prisma db push` 建表 → 幂等 seed 演示数据 → 启动后端 → 构建并启动前端。
3. 浏览器访问 **http://localhost:3000**

## 🔗 服务地址

| 服务 | 地址 |
|---|---|
| Frontend（Nginx SPA + /api 反代） | http://localhost:3000 |
| Backend API | http://localhost:8000 （容器内 `http://backend:8000`） |
| 健康检查 | http://localhost:8000/health · http://localhost:3000/api/health |
| PostgreSQL | localhost:5432（user: `workbench` / pass: `workbench_pwd` / db: `workbench`） |

## 🧪 测试账号（密码均为 `123456`）

| 账号 | 角色 | 能看到什么 |
|---|---|---|
| `admin@yunxi.test` | 云溪项目 OWNER；退役项目 OWNER | 全部权限，可退役/恢复项目 |
| `editor@yunxi.test` | 云溪项目 EDITOR；退役项目 VIEWER | 可编辑云溪脚本/素材；退役项目只读 |
| `viewer@yunxi.test` | 云溪项目 VIEWER | 只读；所有写按钮隐藏，直调写 API 仍被 403/410 拒绝 |
| `outsider@yunxi.test` | 仅另一个项目成员 | **看不到云溪项目**；猜云溪任意 ID 返回 403 |

## 🗺️ 深链接清单（可直接粘贴到地址栏验收）

先登录任一账号，再访问：

| 场景 | 链接 |
|---|---|
| 场次脚本 + 定位到第 2 步 | `/projects/p_yunxi/sessions/s_opening?step=2` |
| 素材深链接 | `/projects/p_yunxi/materials/m_drone` |
| **历史导出快照（锁定 v1，永不漂移到最新稿）** | `/projects/p_yunxi/snapshots/snap_v1_export` |
| 旧节点迁移（自动跳到新场次） | `/projects/p_yunxi/legacy/ses_old_101` |
| 旧节点已删除 | `/projects/p_yunxi/legacy/ses_old_404` |
| 旧素材授权到期 | `/projects/p_yunxi/legacy/mat_old_05` |
| 无迁移记录（非法深链接） | `/projects/p_yunxi/legacy/ses_not_there` |
| 已退役项目（只读，写操作 410） | `/projects/p_archived` |
| 非成员猜项目（用 outsider 登录） | `/projects/p_yunxi` |
| 不存在的项目 ID | `/projects/p_does_not_exist` |
| 跨项目拼接 ID（A 的场次放 B 路径） | `/projects/p_archived/sessions/s_opening` |
| 已软删除素材 | `/projects/p_yunxi/materials/m_deleted` |

## 📐 关键设计（详见 `docs/`）

- **ADR-01 先验证访问后恢复草稿**：403/404/410 时本地草稿进入隔离区，不渲染、不上传、不自动合并。
  见 `docs/adr-01-draft-recovery.md`。
- **ADR-02 代次隔离与保存竞争**：`generation` + AbortController；`saveSeq` 防响应乱序；乐观锁 + 行锁防并发覆盖。
  见 `docs/adr-02-navigation-generation-and-save-race.md`。

### 持久化的两类“状态”

- **删除状态**：素材为软删除（`deleteState=DELETED + deletedAt`），并写 `DeleteRecord` 审计行；场次删除同样落审计记录。
- **模块迁移记录**：`NodeMigration` 保存 `legacyNodeId → newNodeId / DELETED / REVOKED`，项目版本随之递增。

## ✅ 验收对照表

| 题目要求 | 实现位置 / 表现 |
|---|---|
| Web 深链接定位场次或素材 | `/projects/:pid/sessions/:sid?step=n`（非法 step 收敛到 1 并修正地址栏）、`/materials/:mid` |
| 后端查询项目版本及成员权限 | `GET /projects/:id/bootstrap` 返回 `version` + `members(role)`；每次写操作项目版本 +1 |
| 持久库存储删除状态和模块迁移记录 | `Material.deleteState/deletedAt`、`DeleteRecord`、`NodeMigration` 表 |
| 路由守卫只管体验，读写接口仍校验所属项目 | `RequireAuth` 仅查登录态；后端 `projectLoader + loadProjectContext` 对所有接口鉴权 |
| 猜到 ID 不能绕过权限 | 非成员项目/场次/素材/快照/迁移解析全部 403；跨项目拼接 ID 404（51 项 API 验收覆盖） |
| 先恢复草稿 vs 先验证访问的比较；权限收回本地处理；等待体验 | ADR-01；草稿隔离区面板；骨架屏+“先校验访问”文案；401 全局过期模态 |
| 异步导航目标代次隔离 | `workbenchStore.generation + AbortController`；脚本 `loadGen`；旧链接解析代次；组件 key 重建 |
| 快速切项目不能把甲脚本加载到乙页面 | 过期代次响应提交前丢弃（并发测试验证） |
| 保存/离开竞争：已提交、待同步、冲突 | 编辑器状态条五态；草稿即时落本地；乐观锁 409；冲突对话框三选一 |
| 禁止为导航自动覆盖服务器新稿 | OVERWRITE 仅在冲突对话框用户显式点按；守卫/自动流程不触发 |
| 非法深链接 | 无迁移记录 404 → 无效链接页；坏 step 收敛；未知路由 404 页 |
| 项目退役 | 读放行、写全部 410；前端只读横幅；快照仍可读 |
| 旧节点迁移 | 解析 RESOLVED 替换地址栏到新节点；DELETED/REVOKED 分别给删除/授权失效页 |
| 登录会话过期 | axios 401 拦截器 → 全局模态 → 登录后带 `returnTo` 回原深链接并重新鉴权 |
| 浏览器后退 | dirty/conflict/saving 时 `useBlocker` 拦截；`beforeunload` 兜底 |
| 保存响应乱序 | `saveSeq` 序号 + 单飞；只接受最新一次响应（并发测试验证） |
| 地址栏、当前步骤、编辑对象一致 | step 参数双向同步；切换场次重建组件；代次校验保证对象不串台 |
| 历史导出链接按快照访问，不导向最新稿 | `Snapshot` 绑定不可变 `ScriptVersion`；快照页不请求最新稿（验收：v1 快照在脚本升到 v3 后仍返回 2 步旧稿） |

## 🧱 目录结构

```
.
├── docker-compose.yml          # db + backend + frontend 全容器编排
├── docs/
│   ├── adr-01-draft-recovery.md
│   └── adr-02-navigation-generation-and-save-race.md
├── backend/
│   ├── Dockerfile              # 单阶段：装依赖 → prisma generate → tsc 校验
│   ├── docker-entrypoint.sh    # 等 DB → db push → seed → 启动
│   ├── prisma/
│   │   ├── schema.prisma       # 10 张表（成员/软删除/迁移/版本/快照）
│   │   └── seed.ts             # 固定 ID 演示数据，幂等
│   └── src/
│       ├── auth.ts             # JWT 认证 + 项目上下文鉴权 + 可写校验
│       ├── errors.ts           # 统一错误（400/401/403/404/409/410）
│       └── routes/             # auth/projects/resolve/sessions/materials/scripts/snapshots
└── frontend/
    ├── Dockerfile + nginx.conf # SPA 回退 + /api → backend:8000
    └── src/
        ├── api/                # axios（401 事件）、类型、接口门面
        ├── stores/             # authStore、workbenchStore（代次隔离）
        ├── lib/draftStore.ts   # 本地草稿 + 隔离区
        ├── router/             # RequireAuth（只管体验）
        └── workbench/          # 工作台：脚本编辑器状态机、冲突框、快照、旧链接收敛
```

## 🔐 后端鉴权要点

1. JWT Bearer Token（8h），篡改/过期 → 401。
2. 每个资源路由先过 `projectLoader`：校验当前用户是 `:projectId` 的成员；
   **不是成员时，项目存在给 403、项目不存在给 404**，避免用 403 枚举项目 ID。
3. 资源查询全部带 `projectId` 条件（如 `findFirst({ id: sessionId, projectId })`），跨项目 ID 一律 404。
4. `requireWritable`：退役项目 → 410；VIEWER → 403。
5. 脚本保存乐观锁：`baseVersion` 不匹配 → 409 并回传服务器最新内容；`(scriptId, version)` 唯一约束 + 行锁防并发双花。

## 🐳 镜像源

Dockerfile 内已将 npm 指向淘宝镜像（`https://registry.npmmirror.com`）；基础镜像使用官方 `node:20-alpine`、`postgres:16-alpine`、`nginx:alpine`。
