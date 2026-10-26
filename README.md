# JY FITNESS ATLAS

GitHub 源码：[JasonCccxx/Fitness-app](https://github.com/JasonCccxx/Fitness-app)。

2026-10-27 接入 Supabase 后端、Google 登录、私人计划和管理工作台。现有三个初版 3D 动作样本：徒手深蹲、俯卧撑、哑铃弯举。运行本地网站后打开 [Motion Lab](http://localhost:4173/motion-lab/index.html)，可旋转、暂停、慢放、查看关键阶段，并导出 GIF 或下载 GLB。

样本状态及来源见 [S07 v0.2](docs/S07-motion-samples-v0.2.md)。工程检查：`node site/scripts/check-motion.mjs`。重新生成模型需要 Python 与 NumPy（本轮使用 2.4.2），执行 `python site/scripts/build-motion-samples.py`。

![三个 3D 动作样本](docs/previews/motion-lab/three-motion-samples.gif)

暗色主题探索网站的交互原型。包含首页、Gym / Outdoor / Functional、资料库、搜索筛选、三类内容结构预览与训练路线说明。三个动作仍为待专业审核的样本；正式教程继续完善。

远端托管与访问范围见 [S10 v0.3](docs/S10-public-access-v0.3.md)，GitHub 与本轮同步方式见 [S05 v0.3](docs/S05-github-v0.3.md)。前端资料库与 Motion Lab 从 Supabase 读取发布结果；GLB/GIF 原文件保存在后端私有存储。

已发布：[打开 JY FITNESS ATLAS](https://jy-fitness-atlas-20261019.wellbat513.chatgpt.site)。已开放匿名浏览，无需 GPT 账号；此地址不依赖本机服务。下面的本地运行方式保留供以后开发使用。

## 本地打开

双击项目根目录的 `启动网站.cmd`，然后在浏览器打开：

[http://localhost:4173](http://localhost:4173)

也可在 PowerShell 运行：

```powershell
cd "D:\创业\Fitness app\site"
npm start
```

需要 Node.js 22 或以上。首次开发执行 npm ci；修改 site/client 后执行 npm run build:client。关闭服务可在启动终端按 Ctrl+C；服务运行期间保持终端开启。

## 同一网络试用

先停止仅本机模式，再运行：

```powershell
node server.mjs --host 0.0.0.0
```

用启动终端打印的 `Network` 地址在同一 Wi-Fi 的设备上访问。其他人的 `localhost` 指向他们自己的设备，不能把本机地址直接当成外网链接。局域网是否可达还取决于网络隔离和系统防火墙；本轮没有修改这些设置。

## 检查

```powershell
npm test
npm run check
npm run smoke
```

在 `site` 目录执行；`smoke` 需要本地服务已启动。

## 文档

- [步骤与当前版本](docs/README.md)
- [S08 试用任务与反馈表](docs/S08-user-testing-v0.1.md)
- [S09 验证记录](docs/S09-validation-v0.1.md)
- [S10 本地部署说明](docs/S10-local-preview-v0.1.md)

本轮检验的是结构与交互。真实用户验证尚未进行，真实内容的检索和阅读体验需填充后复验。

## 后端与账号

- [Google 登录 / 我的训练](https://jy-fitness-atlas-20261019.wellbat513.chatgpt.site/account/index.html)
- [管理工作台](https://jy-fitness-atlas-20261019.wellbat513.chatgpt.site/admin/index.html)（需要管理员角色）
- [数据库、权限与配置](docs/S05-backend-auth-v0.4.md)
- [教程和媒体维护](docs/S07-backend-content-v0.3.md)
- [后台验证记录](docs/S09-backend-validation-v0.3.md)

不要将数据库密码、服务密钥或 Google OAuth secret 写入源码。backend-config.json 中的 publishable key 可公开，所有私有数据由服务端 RLS 和权限函数保护。
