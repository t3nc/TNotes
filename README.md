# TNotes

> 单人使用的端到端加密笔记 Web 应用。一个访问密码即可登录，所有内容在浏览器内加密后才上传，
> 服务端只保存密文与最小结构元数据 —— 数据库被拖库也无法还原任何笔记正文。

部署目标是 Cloudflare 免费层（Workers + D1 + Static Assets），纯网页形态，可安装为 PWA，
电脑与手机浏览器自适应。

## 特性

- **端到端加密**：标题、正文、笔记本名、标签名、图片附件全部在浏览器内用 AES-256-GCM 加密后才上传。
- **密码登录**：Argon2id 派生密钥，登录只提交派生出的登录凭据哈希，服务端不保存密码、不保存明文。
- **富文本编辑**：TipTap / ProseMirror，支持加粗、标题层级、列表、待办清单、引用、代码块、链接、表格。
- **Markdown 快捷输入**：输入 `#`、`-`、`[]`、`>` 等符号自动转成对应块级格式，并可随时查看 / 复制 Markdown 源码，导出即 Markdown。
- **图片附件**：粘贴截图、手机拍照直接插入，客户端先压缩再加密上传，正文内以附件引用存储。
- **组织与检索**：多笔记本 + 标签双维分类、收藏、回收站（软删除）、客户端全文搜索与关键词高亮、统计面板。
- **备份与还原**：一键导出 ZIP（每篇 Markdown + 附件原图 + meta.json），也可整体导入还原。
- **PWA**：可安装到桌面 / 手机主屏，离线可打开应用外壳，支持深浅色主题与移动端安全区适配。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | React 19 + TypeScript + Vite 5，react-router v7，Zustand |
| 编辑器 | TipTap v2（ProseMirror）+ tiptap-markdown |
| 样式 | Tailwind CSS 3.4 + CSS 变量设计 token（深浅双主题） |
| PWA | vite-plugin-pwa（Workbox） |
| 密码学 | hash-wasm（Argon2id）+ WebCrypto（HKDF / HMAC / AES-256-GCM） |
| 后端 | Hono 4 on Cloudflare Workers，Static Assets 托管前端 |
| 数据库 | Cloudflare D1（图片按 256KB 分块存储，不依赖需绑卡的 R2） |
| 部署 | Wrangler 4，单 Worker 同时提供 API 与 SPA |

## 目录结构

```
.
├── apps/
│   ├── web/          # React 前端（含 PWA 配置、图标资源）
│   └── worker/       # Hono Worker + D1 迁移脚本 + wrangler 配置
├── packages/
│   └── shared/       # 前后端共享类型、加密常量、id 工具
├── scripts/          # 图标生成、API 冒烟测试、浏览器端到端测试
└── package.json      # npm workspaces 根，统一脚本入口
```

## 加密模型

```
password ──Argon2id──> master ──HKDF-SHA256──> kEnc   # 数据密钥（AES-256-GCM）
                                        ├──> kWrap  # 包裹密钥（用于改密码）
                                        └──> kLogin # 登录密钥
kLogin ──HMAC-SHA256──> loginSecret ──> 提交服务端（服务端只存 SHA256(loginSecret)）
```

- `kEnc` 永不离开浏览器；服务端持有的 `wrappedKey = AES-GCM(kEnc, kWrap)` 只用于换密码时重新包裹。
- 改密码只需重新包裹 `kEnc`，**无需重新加密全部笔记**。

| 服务端可见 | 服务端仅存密文 |
| --- | --- |
| 笔记 id、创建 / 更新时间、删除标记、收藏标记、笔记本 id、标签 id、字数 | 标题、正文、笔记本名、标签名、图片字节 |

因此所有过滤、排序、全文搜索与统计都在客户端对解密后的数据执行。

## 本地开发

前置：Node.js ≥ 20、Cloudflare 账号（部署时需要）。

```bash
npm install

# 本地开发变量：首次初始化笔记库需要的服务端令牌
cp apps/worker/.dev.vars.example apps/worker/.dev.vars
# 编辑 apps/worker/.dev.vars，设置 SETUP_TOKEN=<你自己的随机串>

npm run db:migrate:local   # 建本地 D1 表
npm run dev                # web :5173 + worker :8787
```

打开 http://localhost:5173 进入初始化向导，输入 `.dev.vars` 中的令牌并设置访问密码。
若本地 8787 端口被占用，可用 `TNOTES_DEV_API=http://127.0.0.1:<端口>` 覆盖 Vite 的 API 代理目标，
并同步调整 `apps/worker/package.json` 中的 `dev` 脚本端口。

## 部署到 Cloudflare

```bash
npx wrangler login

# 1) 创建数据库，把返回的 database_id 填入 apps/worker/wrangler.jsonc
npx wrangler d1 create tnotes

# 2) （可选）绑定自定义域名：在 wrangler.jsonc 的 routes 中加入
#    { "pattern": "notes.example.com", "custom_domain": true }
#    该域名需托管在同一个 Cloudflare 账号。

# 3) 建表
npm run db:migrate:remote

# 4) 设置初始化令牌（首次设置密码时校验，避免被他人抢先占用）
npx wrangler secret put SETUP_TOKEN

# 5) 构建并部署（单 Worker 同时托管 API 与前端）
npm run deploy
```

部署完成后访问你的域名，按向导输入 `SETUP_TOKEN` 与自设密码即可。
初始化完成后建议删除该 secret：`npx wrangler secret delete SETUP_TOKEN`（此时笔记库已存在，初始化入口自动关闭）。

> 如果你希望仓库保持通用配置、而把真实标识留在本地，可在 `apps/worker/wrangler.local.jsonc`
> 中填写自己的 `database_id` 与自定义域名（该文件已被 `.gitignore` 排除），并使用
> `npm run deploy:local-config --workspace @tnotes/worker` 部署。

## 验证

```bash
npm run typecheck   # tsc --noEmit（三个包）
npm run lint        # ESLint
npm run test        # Vitest 单元测试（加密往返、密钥包裹、搜索、备份、Markdown）

# API 冒烟测试（需要本地 Worker 已启动）
npm run test:api

# 浏览器端到端测试（需要本地 Worker + 前端已启动，会输出截图到 e2e-shots/）
npm run test:e2e
```

两个测试脚本的环境变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `TNOTES_BASE` | `http://127.0.0.1:8787` | 被测服务地址 |
| `TNOTES_SETUP_TOKEN` | 无 | 首次初始化所需的令牌，缺失时脚本会提示 |
| `TNOTES_TEST_PASSWORD` | `tnotes-test-password` | 测试用密码（仅用于本地 / 自建环境） |

## 安全须知

- **忘记密码 = 永久丢失笔记**：内容密钥由密码派生，服务端没有后门，也无法代为恢复。
- 导出的 ZIP 是**解密后的明文**，请当作敏感文件保管。
- 加密只保护「服务端被攻破 / 数据被拖库」这一场景；若浏览器本身被控制，密钥同样会暴露。
- 免费层配额：Workers 10 万请求 / 天；D1 5 GB 存储、500 万行读 / 天、10 万写 / 天；单图建议 ≤ 2 MB。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 同时启动前端与本地 Worker |
| `npm run build` | 构建前端产物到 `apps/web/dist` |
| `npm run deploy` | 构建并部署到 Cloudflare |
| `npm run db:migrate:local` / `:remote` | 应用 D1 迁移 |
| `npm run icons` | 重新生成 PWA 图标 |

## License

MIT，见 [LICENSE](./LICENSE)。
