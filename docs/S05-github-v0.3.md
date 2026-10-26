# S05｜GitHub 与样本版本管理 v0.3

日期：2026-10-26。前版：[S05 v0.2](S05-version-control-v0.2.md)。

## 用户自己的代码仓库

用户建立并指定公开仓库 [JasonCccxx/Fitness-app](https://github.com/JasonCccxx/Fitness-app)。原先讨论的私有仓库方案以用户这次选择的公开仓库为准。GitHub 插件确认账号与仓库写入权限；本地 `origin` 指向该仓库。

本轮通过 GitHub 插件的 Git object 接口同步源码和二进制素材；本机 Git 尚未配置该 GitHub 账号的推送凭据，因此本地普通 `git push` 仍需单独完成 Git 登录。GitHub 插件授权与本机 Git 登录是两套授权，不应混为一谈。

同步范围为项目源码、文档、样本生成脚本、基础人体模型、三个 GLB、GIF 预览与上游许可文件。`.local` 临时文件、依赖目录、环境文件和凭据不进入仓库。当前没有新增用户数据库、Google OAuth 密钥或用户资料。

## 托管与访问状态

原 Sites 项目标识保持不变。本轮获取了原站点状态及短期源码访问授权，但其返回的源码主机 `git.chatgpt-team.site` 在当前电脑上无法解析；因此原线上网站尚未更新为本轮样本版本。

本轮可通过 `node site/server.mjs` 在本地查看 `/motion-lab/index.html`，GIF 预览位于 `docs/previews/motion-lab/`。GitHub 保存源码并不代表已经配置网站自动部署。恢复 Sites 源码同步或选择新的部署目标后，再发布并复验。

本轮样本及验证范围见 [S07 v0.2](S07-motion-samples-v0.2.md)。
