# JY FITNESS ATLAS Implementation Plan

> 执行方式：在当前会话按步骤实现；用户已授权实施。交付前按 requesting-code-review 技能安排独立只读审查，不委派实现或创建额外用户会话。

**Goal:** 建立暗色、可在本机运行和试用的主题探索网站，并记录 S04—S10 的实际交付和限制。

**Architecture:** 采用静态 HTML、CSS 与浏览器 ES Modules。主题配置、空内容数据、查询逻辑、页面渲染分离；Node.js 仅提供本地静态服务和测试。保留日后替换内容来源及引入训练工具的边界。

**Tech Stack:** HTML、CSS、原生 JavaScript、Node.js 内置 HTTP 与 test runner；当前不需要 npm 依赖或外部数据库。

## 1. S04 设计与素材

- 创建 `docs/S04-visual-design-v0.1.md`：颜色、导航、手机断点、首页和资料页方案。
- 将场景图保存到 `site/dist/assets/`；记录原始链接与用途，不将照片当作教学示范。

## 2. S05 工程与测试基础

- 创建 `site/package.json`、`site/server.mjs`、`site/scripts/check.mjs`。
- 先在 `site/tests/core.test.mjs` 写检索与 URL 行为测试，运行 `node --test site/tests/core.test.mjs` 确认未实现时失败。
- 再实现 `site/dist/core.js`：路径解析、条件规范化、内容查询、类型切换清除不适用条件、空状态判定。
- 用仅存在于测试文件中的人工测试条目验证 AND/OR、草稿隔离、别名及范围；不把测试条目发布到页面。
- Node 服务仅公开 `site/dist/`，不公开 docs、源码测试或本机文件；支持深链接回退和 404 资源状态。
- 运行测试并记录到 `docs/S05-engineering-v0.1.md`。

## 3. S06 页面与行为

- 创建 `site/dist/index.html`、`styles.css`、`app.js`、`data.js`。
- 实现首页、三主题、资料库、三类详情结构预览、训练路线、不可用页。
- 实现真实 URL 状态、键盘搜索、移动筛选抽屉、焦点恢复和历史恢复。
- 内容数组保持为空；实现可复用检索器并以测试验证其行为。
- 用 `node --check`、测试和浏览器检查；记录到 `docs/S06-core-browsing-v0.1.md`。

## 4. S07 内容入口

- 创建内容结构说明和可用的内容示意 JSON；示意不作为发布内容。
- 记录图片来源、后续填入方法和公开内容为空的限制。
- 保存 `docs/S07-content-preparation-v0.1.md`。

## 5. S08 试用准备

- 创建 `docs/S08-user-testing-v0.1.md`：现场导航任务、预期表现、记录表；区分内容填充后任务。
- 不代替真实用户反馈，不将测试方案准备完成记为用户验证完成。

## 6. S09 验证

- 执行 `npm --prefix site test`、`npm --prefix site run check`。
- HTTP 检查首页、主题、资料库、预览、资源和非法资源路径。
- 可用时用浏览器检查桌面、窄屏、搜索、筛选、返回、弹窗和未知路径；实际限制如实记录。
- 保存 `docs/S09-validation-v0.1.md`。

## 7. S10 本地交付

- 提供 `启动网站.cmd` 和运行说明；默认回环地址，局域网试用使用明确的 `--host 0.0.0.0` 参数。
- 启动本地预览并验证地址；不需要正式域名。
- 保存 `docs/S10-local-preview-v0.1.md`，更新 `docs/README.md`、主说明版本及根目录 README。
- 报告实际完成的步骤、测试证据、访问方式和仍待真实用户验证的事项。
