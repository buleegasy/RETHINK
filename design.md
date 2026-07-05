# RE-THINK 心理支持 AI 平台设计规范 (Design DNA)

本文档定义了 RE-THINK 心理支持 AI Web 应用的全局设计系统、视觉风格与交互特效规范。该系统基于 Material Design 3 (MD3) 理念进行了深度定制，以适应心理干预场景下对“温暖、克制、高级感”的特殊诉求，并大量参考了 Google Gemini App 的最新设计语言。

## 1. 核心设计原则 (Design Principles)

- **温暖与克制 (Warm & Restrained)**: 避免过度刺眼的色彩对比，采用低饱和、高明度的柔和色调，减少使用者的视觉压力与心理防备。
- **动态呼吸 (Dynamic & Breathing)**: 通过流体渐变、柔和的毛玻璃阴影以及平滑的微动画，让界面具备“生命感”和“呼吸感”，传达 AI 在“倾听”与“思考”的拟人化体验。
- **空间秩序 (Spatial Harmony)**: 利用大面积留白、沉底式信息流排版，将用户视线自然地聚焦于当下正在进行的对话上，避免无关元素的干扰。

---

## 2. 设计系统 Token (Design System)

所有的设计 Token 均已在 `tailwind.config.js` 中通过继承和扩展实现。

### 2.1 色彩系统 (Color Palette)

采用了定制的 Gemini MD3 Surface 颜色系统，以及柔和的语义颜色。

#### 表面与背景 (Surface)
- `surface.dim` (`#F0F4F9`): 核心背景色，微冷的柔和浅灰蓝，是营造 Gemini 高级感的基础底色。
- `surface.DEFAULT` (`#FFFFFF`): 纯白，用于聊天气泡、输入框等核心卡片内容。
- `surface.container` (`#E8EDF2`): 容器背景色。

#### 文本与前景色 (On Surface)
- `on.surface` (`#1F1F1F`): 主要文本颜色，近乎黑色的深灰，保证阅读对比度但不如纯黑刺眼。
- `on.surface-variant` (`#5F6368`): 次要文本颜色（如时间戳、辅助说明）。
- `on.surface-dim` (`#9AA0A6`): 占位符或极弱提示文本。

#### 品牌色 (Brand)
- `gemini.blue` (`#4285F4`): 核心品牌蓝，用于主按钮、Focus 状态的光晕、以及流体背景特效。
- `gemini.blue-light` (`#8AB4F8`): 较浅的品牌蓝，用于渐变过渡。
- `gemini.purple` (`#A142F4`): 品牌紫，用于丰富流体背景的光影层次。

#### 边框与语义 (Outline & Semantic)
- `outline.variant` (`#E1E3E1`): 极弱的描边，用于划分区域而不抢占视觉焦点。
- `error.DEFAULT` (`#B3261E`): 柔和但明确的错误红。

### 2.2 排版 (Typography)

全面接入 Google Fonts 生态，针对长文本阅读进行了优化。

- **Font Family**: 
  - `sans`: `"Google Sans Text", Inter, system-ui` (用于正文)
  - `display`: `"Google Sans", "Google Sans Text", Inter` (用于标题和大型文本)
- **阅读优化**: 
  - AI 回复气泡采用 `leading-[1.6]` (160%行高) 配合适当的段落间距 (`mb-2.5`)，以提供最舒适的长文阅读体验。

### 2.3 几何与阴影 (Shape & Elevation)

- **圆角 (Border Radius)**: 
  - `bubble`, `input`: `32px` (极致圆润，消除锋利感)
  - `card`: `24px`
- **阴影 (Box Shadow)**:
  - 弃用生硬的黑色投影，改用极淡的柔和阴影 (`rgba(0,0,0,0.03 ~ 0.08)`) 配合 `backdrop-blur` 毛玻璃效果，营造轻盈的悬浮感。
  - `glow`: `0 0 20px rgba(66, 133, 244, 0.25)` 用于聚焦状态下的品牌色呼吸发光。

---

## 3. 视觉与交互特效 (Visual Effects)

### 3.1 动态流光背景 (Ambient Glow)
在主界面的底层，实现了类似 Gemini App 的流体呼吸光效。
- **实现原理**: 使用多个绝对定位的纯色块 (`bg-gemini-blue/30`, `bg-gemini-purple/20`) 配合极高的毛玻璃模糊 (`blur-[120px]`) 相互交叠，并通过 CSS `@keyframes` 让其缓慢位移和缩放 (`animate-pulse-gentle`)。
- **效果诉求**: 不构成视觉疲劳，仅在余光中提供高级的动态氛围。

### 3.2 布局架构 (Layout Architecture)
- **输入区域 (InputBar)**: 悬浮于屏幕底部，采用 `backdrop-blur-md` 确保其不被底层流光背景干扰。处于 Focus 状态时，会平滑地亮起一层品牌蓝色的光晕 (`ring-gemini-blue/15`)。
- **消息列表 (Chat Flow)**: 
  - **沉底排布 (Bottom-Up)**: 消息列表采用纵向 Flex 布局并结合 `mt-auto`。当消息较少时，像微信/iMessage一样紧贴底部输入框向上生长，保证用户的视觉焦点始终集中在屏幕下方最近的对话上。
- **摄像头画中画 (PiP Camera)**:
  - 位于右上角固定悬浮 (`fixed top-24 right-4 z-50`)，采用画中画模式，既能采集情绪数据，又绝不遮挡核心的文本交流流。

### 3.3 微动画 (Micro-Animations)
引入 `framer-motion` 管理所有关键的 DOM 挂载/卸载动画，告别生硬的闪烁。
- **气泡登场 (`messageIn`)**: 气泡出现时伴随极小幅度的向上滑入与缩放 (`translateY(16px) scale(0.97) -> scale(1)`)，曲线使用 MD3 的强调缓动 `cubic-bezier(0.05, 0.7, 0.1, 1.0)`。
- **布局平滑过渡**: 通过 `AnimatePresence` 和 `layout="position"`，在消息流增加、元素高度变化时，所有相关组件会平滑推移，不会发生视觉跳跃。
- **Logo 思考状态**: 处于加载中时，Logo 会呈现 `animate-pulse` 的心跳感。
