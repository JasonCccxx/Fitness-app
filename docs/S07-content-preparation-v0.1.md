# S07｜内容位置与后续填充准备 v0.1

日期：2026-10-19 · 状态：结构准备完成，具体内容与完整 S07 发布准备待后续进行。

## 当前保留的位置

- `site/dist/data.js` 的 `CONTENT` 数组为空，作为日后内容接入点。
- `site/content-structure.json` 保存三类内容字段的空白结构，位于公开目录外；不会作为真实条目被加载。
- `/preview/exercise`、`/preview/guide`、`/preview/workout-template` 为清楚标识的结构预览。
- 当前三张图片只服务首页和主题场景，不用于演示具体训练动作。

## 本地场景素材

| 文件 | 原始来源 | 用途 |
| --- | --- | --- |
| `site/dist/assets/gym.jpg` | [Unsplash 场景图](https://images.unsplash.com/photo-1534438327276-14e5300c3a48) | 首页主视觉与 Gym 主题 |
| `site/dist/assets/outdoor.jpg` | [Unsplash 场景图](https://images.unsplash.com/photo-1476480862126-209bfaa8edc8) | Outdoor 主题 |
| `site/dist/assets/functional.jpg` | [Unsplash 场景图](https://images.unsplash.com/photo-1517836357463-d25dfeac3438) | Functional 主题 |

素材已保存本地，正常浏览不需要访问图片服务。正式推广前再核对并补齐素材使用依据与署名要求。

## 后续填充流程

1. 先确定具体内容及来源，按 S02 决定类型、主题关联和字段。
2. 为真实内容分配稳定 `id` 和可读 `slug`，草稿使用 `publication_status: "draft"`。
3. 补齐文本、真实媒体、适用信息和类型专属结构；根据实际内容完善对应详情渲染。
4. 检查内容准确性、分类和媒体来源，再改为 `published`。
5. 复验主题交叉归属、关键词与别名、筛选、详情及模板关联动作路径。

模板是公开内容；个人保存的计划和实际执行记录留待训练工具阶段设计。

本轮按用户要求不制作具体动作、指南或训练模板，也不建立内容后台和日常运营流程。
