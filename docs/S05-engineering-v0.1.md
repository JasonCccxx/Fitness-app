# S05｜工程基础与本地环境 v0.1

日期：2026-10-19 · 当前已建立可运行工程。

## 技术方案

采用 HTML、CSS、浏览器 ES Modules 和 Node.js 内置服务；当前无第三方 npm 依赖，也没有数据库、账号或上传接口。

选择依据：当前只有公开主题、空内容结构、检索与导航；使用 Next.js＋Supabase 会提前引入部署、认证和数据维护工作。静态目录也方便以后搬到支持静态网站的托管服务。未来增加登录和训练数据时需重新评估框架，页面层可能需要迁移；本轮保留内容标识、查询规则与模块边界，避免承诺零重构。

## 文件职责

| 文件 | 职责 |
| --- | --- |
| `site/dist/index.html` | 页面入口、元信息、搜索与筛选弹窗容器 |
| `site/dist/data.js` | 主题、筛选词表、内容入口；公开内容数组当前为空 |
| `site/dist/core.js` | URL 解析、字段规范化、检索规则、来源与返回位置 |
| `site/dist/app.js` | 页面渲染、路由导航、搜索、筛选、焦点和历史处理 |
| `site/dist/styles.css` | 暗色视觉与响应式布局 |
| `site/server.mjs` | 仅公开 `dist` 的本地服务与深链接回退 |
| `site/tests/` | 检索、范围、草稿、返回位置和 HTTP 集成检查 |
| `site/scripts/check.mjs` | 语法、必要素材、元信息与文档链接检查 |

`dist` 当前就是可直接部署的静态源码目录，无编译步骤；Node 服务独立于前端，可以由静态托管替换。

## 运行与验证

要求 Node.js 22 或更高；本机已核实为 v24.13.0。进入 `site` 后：

```powershell
npm start
npm test
npm run check
```

默认本机地址 `http://localhost:4173`。浏览器刷新主题或资料库深链接时由本地服务返回应用入口。

## 实施细节

- 用户输入通过文本转义插入页面，筛选值受配置词表约束。
- 本地服务不公开 `docs`、测试文件和配置文件，拒绝目录穿越和非 GET/HEAD 请求。
- 核心规则先写测试，确认缺少实现时失败，再实现；测试条目只在测试文件存在。
- HTTP 集成测试在当前受限执行环境需要本地网络权限；授权执行后通过。这是运行环境限制，并未通过关闭检查绕过。
- 无用户信息收集、分析追踪或远端内容请求；场景图片已保存为本地资源。

浏览器核验与最终测试结果统一记录在 [S09](S09-validation-v0.1.md)。

实现参考：[Node.js 内置测试运行器](https://nodejs.org/api/test.html)、[浏览器 History API](https://developer.mozilla.org/en-US/docs/Web/API/History/pushState)。
