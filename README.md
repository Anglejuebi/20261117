# BRIGHT-Flash · 实验设计七张主图

BRIGHT-Flash（乳腺癌 WSI 多任务模型）的**实验设计图版**：7 张主图，每张图配一句「展示方向」，
说明它在文章里承担什么论证任务。

图源：`20261117.pptx`（逐页导出）＋ Figure 4 为单独提供的新稿（非 PPT 原图）。

## 图目录

| # | 图题 | 页面角色 | 数据状态 |
|---|------|----------|----------|
| 1 | Study overview | 开篇地图：管线 + 任务域 + 外部验证 + 覆盖度 | 概念图，含历史点估计 |
| 2 | Comparative performance of other foundation models | 主对照：精度-耗时 + 逐任务差异 | 混合来源历史点估计 |
| 3 | Ablation of selection design | 选择器消融（4 组可单独否证的对照） | 仅 a 为实测点估计 |
| 4 | Visualization of selection heatmap | 机制图：路由热图 → 20x 局部注意力 → 选中父块 | 合成示意（新稿 864×1024） |
| 5 | Extended evaluation | 四任务域外部验证版式 | 合成版式，结果待产出 |
| 6 | Computational efficiency and performance | 效率公平上报：时间 / 算力 / 显存 / 数据量 | 合成概念图，未测量 |
| 7 | Extensibility of BRIGHT-pipeline | 管线可扩展性：S3 编码器可替换 | b–c 档案点估计 |

> 图内自带的 `synthetic` / `illustrative` / `not measured` 标注为准：这些面板尚无实测数据。

## 页面

纯静态，无框架、无 CDN、无追踪、无外部请求。

- **幻灯片式翻页**：8 屏（封面 + 7 张主图），`scroll-snap` 整屏对齐；一张主图完整落在一屏内，
  不跨页、不裁切；图按可视区等比缩放，不上采样。
- 版面：左侧窄栏放「Figure 编号 / 图题 / 展示方向 / 面板清单」，右侧整块留给图。
- 点击图片 → 全屏查看器：滚轮缩放（跟随光标）、拖拽平移、双击切换、双指缩放、`原图` 打开源文件。
- 键盘：`↓` `→` `PageDown` `空格` 翻页；`↑` `←` `PageUp` 回退；`Home` `End`；
  查看器内 `+` `-` 缩放、`0` 适应、`1` 100%、`←` `→` 换图、`Esc` 关闭。

```
index.html
assets/style.css
assets/app.js
assets/figures/fig-0N.webp        # 展示用（quality 90，全分辨率）
assets/figures/orig/fig-0N.png    # 原图（来自 PPTX）；fig-04 为 .webp 新稿
```

## 本地预览

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## 发布

- 线上地址：https://anglejuebi.github.io/20261117/
- Pages 实际发布的是 **`gh-pages`** 分支（本仓库首次推送时由 GitHub 自动开通，源为分支编译）。
- `.github/workflows/publish.yml` 在每次 push `main` 之后，把同一提交强推到 `gh-pages`，Pages 随即重建。
  所以只需要维护 `main`，不要手工编辑 `gh-pages`。
- 验证发布是否生效：页面 HTML 头部有 `<!-- build: ... -->` 时间戳，与本仓库最新提交一致即已上线。
