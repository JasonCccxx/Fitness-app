# S05 工程基础与后台 v0.4

日期：2026-10-27。承接 [v0.3](S05-github-v0.3.md)。

前端保留原有 Sites 静态托管和暗色界面；后端部署于用户自己的 Supabase 免费项目，东京地区。项目引用 `dsinrfllbtlnpuvuiwrt`。Google OAuth 使用独立项目 `carbon-inkwell-512814-t9`，未开通计费。

## 数据与权限

| 数据 | 位置与访问规则 |
| --- | --- |
| 登录身份 | Supabase Auth，Google 基础身份登录 |
| 个人资料 | `public.profiles`；本人读取并编辑允许字段 |
| 管理角色 | `private.user_roles`；客户端不能直接修改 |
| 教程与媒体目录 | `public.contents`、`public.media_assets`；访客只读已发布内容 |
| 私人计划 | `public.plans`、`plan_days`、`plan_items`；仅所属用户读写 |
| 活动、管理审计 | `private.activity_events`、`audit_events`；管理接口读取摘要 |
| 媒体文件 | 私有 Storage 桶 `exercise-media`；发布检查与目录关联后提供短期签名链接 |

十张业务及迁移记录表均启用 RLS。管理员不会因管理角色取得其他用户的私人计划。新注册身份固定为普通用户，不信任 Google 或客户端提交的角色字段。首位管理员已绑定用户授权的真实 Google 登录身份，不采用“第一个注册者自动成为管理员”。

计划通过数据库函数原子保存，使用版本号防止多个页面互相覆盖。内容编辑、发布、角色调整和停用操作由服务端再次核验。最后一位有效管理员不能被降级或停用。

## 维护入口

- 网站账号：`/account/index.html`。
- 管理工作台：`/admin/index.html`，包含教程与媒体、账号与权限、访问与操作记录。
- 迁移源码：`site/backend/migrations/`。两次迁移因插件迁移接口错误，通过官方 SQL 编辑器执行并查询确认；`private.schema_versions` 记录已应用版本。
- 后续迁移新增文件，不修改已经执行的迁移。不要直接重复执行首个创建表脚本。
- 客户端公开配置：`site/dist/backend-config.json`。其中仅包含项目地址和可公开的 publishable key；OAuth secret 仅保存在 Supabase 提供商配置中。
- 浏览器适配源码：`site/client/atlas-api.js`，执行 `npm run build:client` 生成已跟踪的浏览器包。

## Google 配置

Web OAuth 回调是 `https://dsinrfllbtlnpuvuiwrt.supabase.co/auth/v1/callback`。网站回跳仅允许正式站点账号页和本机 `localhost:4173`、`127.0.0.1:4173` 的账号页，没有配置泛域名。

目前 Google 控制台发布状态为 Testing，只请求 `openid email profile`；所有真实登录验证均已通过。Google 官方对只请求基础身份范围的应用设有测试用户名单例外，见 [OAuth 应用状态说明](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview)。仍需在正式扩大运营前完成品牌、隐私说明、自有域名和上线配置的复核；不要将邮件、日历或 Drive 权限加入登录范围。

## 本机开发

在 `site` 目录执行 `npm ci`、`npm run build:client`、`npm start`。已生成的静态客户端随源码保存；仅运行预览服务器可直接使用，但修改客户端 API 后必须重新构建。

检查命令为 `npm test`、`npm run check`、`npm run check:motion`、`npm run smoke`。`node scripts/check-backend-live.mjs` 以匿名身份只读核验线上目录、媒体 SHA-256 和私人数据访问拒绝。

当前后台使用托管服务，不需要购买 VPS。以后迁移前端域名时，同步更新 Supabase 回跳白名单及 Google 品牌信息即可。数据库和存储仍独立存在，不依赖电脑开机。
