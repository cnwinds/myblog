# 界面设计（Breeze · 风）

休闲、艺术、带一点科技感：米白纸张底 + 极光色块 + 颗粒噪点，标题用手写感的霞鹜文楷，数字和标签用等宽字体。浅色 / 深色两套主题共用同一组语义变量。

## 设计变量

全部定义在 `frontend/src/styles/theme.css`，新组件只用短变量；`--color-*` 是给编辑器、设置面板保留的兼容别名。

| 变量 | 用途 | 浅色 | 深色 |
| --- | --- | --- | --- |
| `--paper` / `--paper-2` | 页面底色 | `#f4f0e6` / `#ebe5d6` | `#0c0d11` / `#17181f` |
| `--card` | 卡片 | `#fffcf5` | `#15161d` |
| `--ink` / `--ink-2` / `--ink-3` | 正文 / 次要 / 辅助文字 | `#18171d` … | `#f3efe6` … |
| `--line` / `--line-strong` | 分隔线 | 10% / 18% 墨色 | 8% / 16% 纸色 |
| `--glass` | 毛玻璃（导航、登录卡片） | 72% 卡片色 | 66% 卡片色 |
| `--coral` `--pink` `--violet` `--mint` `--sun` | 强调色 | 同左 | 同左 |
| `--chip-{coral,violet,mint,sun}-{fg,bg}` | 标签前景 / 背景 | 浅底深字 | 透明底亮字 |
| `--grad-wind` | 品牌渐变（珊瑚 → 粉 → 紫 → 薄荷） | 同左 | 同左 |
| `--aurora-1..3` | 顶部极光色块 | 柔和粉彩 | 高饱和、低透明度 |

```css
.my-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-soft);
}
```

## 字体

全部自托管（npm 包，构建时打进 `dist`），不依赖境外 CDN。中文字体按 `unicode-range` 分片，浏览器只下载页面用到的字。

| 变量 | 字体 | 用途 |
| --- | --- | --- |
| `--f-art` | LXGW WenKai（`lxgw-wenkai-webfont`） | 标题、站点名、引用 |
| `--f-body` | 系统字体（苹方 / 微软雅黑） | 正文 |
| `--f-mono` | JetBrains Mono（`@fontsource/jetbrains-mono`） | 日期、计数、标签、键位 |
| `--f-latin` | Instrument Serif Italic（`@fontsource/instrument-serif`） | 英文点缀、大号数字 |

字体样式在 `src/main.tsx` 里先于 `theme.css` 引入。

## 主题

- `html[data-theme="light" | "dark"]` 切换变量
- 没有手动选择时跟随系统 `prefers-color-scheme`，并监听系统变化；点击切换后写入 `localStorage.theme`
- `index.html` 内联脚本在首屏渲染前设置 `data-theme`，避免闪烁
- 逻辑在 `src/contexts/ThemeContext.tsx`

## 通用样式类

| 类名 | 说明 |
| --- | --- |
| `.container` | 最大宽度 1240px，左右留白 40px（手机 18px） |
| `.eyebrow` | 等宽小字 + 前置短横线的分区标题 |
| `.chip` `.chip-coral` … | 胶囊标签 |
| `.btn` + `.btn-primary` / `.btn-wind` / `.btn-secondary` / `.btn-danger` / `.btn-success`，`.btn-sm` | 按钮（`.btn-wind` 为品牌渐变） |
| `.icon-btn` | 38px 圆形图标按钮 |
| `.card` `.input` `.loading` `.empty-state` | 卡片、输入框、加载、空状态 |
| `.art` `.mono` `.latin` | 字体快捷类 |

## 页面骨架

```
SiteLayout
├── Backdrop        极光色块 + 坐标网格
├── SiteHeader      悬浮胶囊导航：品牌 / 博客·实验室 / 状态 / ⌘K 搜索 / 主题 / 管理入口
├── main            页面内容
├── SiteFooter      页脚 + 描边大字
├── CommandPalette  ⌘K / Ctrl K / "/" 打开，前端搜索标题、摘要、标签、正文
└── SettingsDrawer  系统设置抽屉
```

组件都在 `src/components/Layout/`。首页、实验室、文章页、草稿箱使用 `SiteLayout`；登录页单独使用 `Backdrop` + `BrandMark`；编辑器保持全屏工具布局，只跟随配色变量。

| 页面 | 组件 | 要点 |
| --- | --- | --- |
| 首页 `/` | `components/Home/BlogHome.tsx` | Hero（流场插画 + 终端卡片 + 统计）、置顶最新文章、编号列表、侧栏（关于 / 实验室精选 / 52 周写作热力图） |
| 实验室 `/lab` | `components/Article/LabList.tsx` | 见 [lab.md](lab.md) |
| 文章 `/article/:id` | `components/Article/ArticleDetail.tsx` | 顶部阅读进度条、首图大封面、左侧操作栏、右侧目录（h2/h3 自动编号、高亮当前章节、剩余阅读时间）、上一篇 / 下一篇 |
| 草稿箱 `/drafts` | `pages/DraftsPage.tsx` | 与首页列表同款的编号行 |
| 登录 `/login` | `components/Auth/Login.tsx` | 毛玻璃卡片 |

## 站点文案

所有可改的个人文案集中在 `frontend/src/config/site.ts`，改文案不需要动组件：

```ts
export const siteConfig = {
  name: 'cnwinds',
  role: '工程师 · 鱼缸维护员',
  status: '在风里写代码',      // 导航栏状态
  heroEyebrow: 'cnwinds / notes & experiments',
  heroLead: '…',               // 首页导语
  motto: ['…', '…'],           // 侧栏关于卡片
  labLead: '…',                // 实验室导语
  githubUrl: 'https://github.com/cnwinds',
};
```

## 数据派生

纯函数在 `src/utils/articleText.ts`，有单元测试（`articleText.test.ts`）：

- `readingMinutes` / `countWords`：中文按字、英文按词计数，每分钟 400 字
- `extractHeadings` / `slugifyHeading`：目录与锚点（跳过代码块）
- `weeklyActivity`：首页写作热力图（按周统计发文数）
- `getCoverImage` / `splitLeadingCover`：封面取正文首图或 `imagePlans`；文章页把开头的图片提出来做大封面

文章列表通过 `articleService.getArticlesCached` 做内存缓存，创建 / 更新 / 删除后自动失效；组件里用 `useArticles(category)`。

## 实验室 Bento 布局

`src/components/Article/labLayout.ts` 的 `assignCellSizes(count)` 为 4 列网格分配卡片尺寸，按整行块拼接，任何数量都不留空洞：

| 块 | 组成 | 行数 |
| --- | --- | --- |
| A | big(2×2) + tall(1×2) + tall | 2 |
| B | wide(2×1) + small(1×1) + small | 1 |
| C | tall + tall + wide + wide | 2 |

顺序 A → B → C → B → C …；剩 1 张用 full(4×1)，剩 2 张用两张 wide，剩 3 张用 B。窄屏下 CSS 改为 2 列，尺寸类只影响视觉比例。

## 无障碍与动效

- 所有图标按钮带 `aria-label`
- 入场动画（`rise`）、状态呼吸灯等在 `prefers-reduced-motion: reduce` 下关闭
- 图片懒加载，加载失败时回退到生成的渐变封面（`CoverImage.tsx`）
