# S09｜3D 样本验证 v0.2

日期：2026-10-26。此前的 [结构原型验证 v0.1](S09-validation-v0.1.md) 保留。

## 自动检查

- `node --test site/tests/*.test.mjs`：25 项通过，0 项失败。
- `node site/scripts/check.mjs`：原站点语法、资源、文档链接检查通过。
- `node site/scripts/check-motion.mjs`：三个模型的 GLB 格式、单一动画、97 帧/4 秒时长、有限数值、单位四元数、文件 SHA-256 和基础人体来源校验通过。
- 生成器的骨段长度漂移最大值小于 `1e-12` 米，循环首尾矩阵相同；这只是工程检查。
- 三个导出 GIF 均为 640×480、40 帧、4 秒循环，具有不同的可见帧；检查记录见 [GIF 验证](previews/motion-lab/gif-verification.json)。

## 浏览器验证

- 检查桌面双栏和 375×812 手机视口；手机文档宽度等于可视宽度，无横向溢出，测试后恢复默认视口。
- 三动作切换、正面/侧面/斜侧、关键阶段暂停、慢放和重置实际操作通过。
- 三个 GIF 由实际播放器导出并保存，均成功下载。
- 首页新增的样本入口可进入独立页面；原教程资料库仍保持未填充状态。
- 观察中修复弯举手部握持、俯卧撑手掌朝向、相机取景和自定义元素初始化顺序；这些修正不替代专业动作审核。

## 预览文件

- [三个动作的 GIF 总览](previews/motion-lab/three-motion-samples.gif)
- [桌面页面](previews/motion-lab/motion-lab-desktop.png)
- [手机页面](previews/motion-lab/motion-lab-mobile.png)

## 本轮限制

真实用户试用与专业动作审核尚未进行。模型是运动学近似，未模拟肌肉力或关节负荷。原 Sites 源码主机当前无法解析，线上初版未被本轮修改替换；本轮通过本地页面和 GIF 交付样本。
