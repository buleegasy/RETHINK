# Codebase Research Report: React Frontend Backgrounds, Overlaps, Buttons, and Localization

This report details the investigation of the React frontend codebase at `/Users/chenhaoran/工程文件/心理大赛/web` regarding background components, layout overlap, button implementations, and the status of Chinese localization.

---

## 1. Background Components: AmbientGlow and ArtMeshBackground

### Findings
* **`AmbientGlow` (Active)**:
  * **Implementation**: Located at `web/src/components/layout/AmbientGlow.tsx`. It is a pure CSS + `framer-motion` component that renders three absolute-positioned, blurred, pulsing divs with radial gradients (colors: Deep Sky Blue `rgba(66, 133, 244, 0.45)`, Mint Cyan `rgba(0, 188, 212, 0.35)`, and Coral Peach `rgba(234, 67, 53, 0.25)`).
  * **Rendering**:
    * Rendered in the authenticated view in `web/src/App.tsx` on line 89:
      ```tsx
      <AmbientGlow />
      ```
    * Rendered as the background in `web/src/components/auth/LoginWall.tsx` on line 14:
      ```tsx
      <AmbientGlow forceShow={true} />
      ```
* **`ArtMeshBackground` (Deleted)**:
  * **Implementation**: Previously located at `web/src/components/layout/ArtMeshBackground.tsx`. It was a WebGL-based dynamic art installation background using `@react-three/fiber` and `three`. It rendered a plane geometry with custom vertex and fragment shaders for organic waving displacements and warm peach/yellow physical textures.
  * **Deletion**: It was completely deleted in the latest commit `cb7b47e` ("feat: overwrite and sync codebase files with iCloud backup versions, resolve UI conflicts and verify CI/CD build") and replaced by the lightweight `AmbientGlow` to avoid UI conflicts or build issues.
  * **Dependencies**: The required packages `@react-three/fiber` (v9.6.1), `@react-three/drei` (v10.7.7), and `three` (v0.184.0) are still listed in `package.json`.

### Projections & Proposed Changes
If the dynamic WebGL `ArtMeshBackground` needs to be restored or made toggleable alongside `AmbientGlow`:
1. **Recreate File**: Restore the Three.js shader code in `web/src/components/layout/ArtMeshBackground.tsx` (using git history or the copy documented in this agent's workspace files).
2. **Integration in App.tsx / LoginWall.tsx**:
   * Import both `AmbientGlow` and `ArtMeshBackground`.
   * Add a state or config flag (e.g., `useWebGLBackground` in `useChatStore` or a local state) to swap between them based on performance preferences or hardware support.
   * Conditional render in `App.tsx` (line 89) and `LoginWall.tsx` (line 14):
     ```tsx
     {useWebGLBackground ? <ArtMeshBackground /> : <AmbientGlow />}
     ```

---

## 2. Layout & Overlap: LoginWall and Chat Interface

### Findings
* **Layout Structure**: Both are managed in `web/src/App.tsx` return statement:
  ```tsx
  return (
    <div className="fixed inset-0 flex w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-surface-dim/40 text-on-surface font-sans selection:bg-gemini-blue/20">
      {isAuthenticated ? (
        <>
          <AmbientGlow />
          <div className="flex flex-col flex-1 h-full relative z-10">
            {/* Header, Error Snackbar, ChatPanel, InputBar */}
          </div>
          <SessionSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
          {/* Overlays like CrisisOverlay */}
        </>
      ) : (
        <LoginWall />
      )}
    </div>
  );
  ```
* **Overlap Behavior**:
  * **No DOM Overlap**: Because they are conditionally rendered based on `isAuthenticated` (from `store/authStore.ts`), they are **mutually exclusive**. When `isAuthenticated` is `false`, the main workspace and chat elements are completely unmounted. When `isAuthenticated` is `true`, `LoginWall` is completely unmounted.
  * **Transition Snap**: Since there is no wrapper `AnimatePresence` managing the mounting/unmounting of the authenticated block vs. the `LoginWall` block at the root, the UI snaps instantly between the login wall and the main chat workspace.

### Proposed Changes
To introduce a smooth transition (fade/blur) when transitioning from `LoginWall` to the main chat interface:
1. **Wrap in AnimatePresence**: In `App.tsx`, wrap the conditional branches in a `framer-motion` `AnimatePresence` and use `<motion.div>` with key props.
   ```tsx
   <AnimatePresence mode="wait">
     {isAuthenticated ? (
       <motion.div
         key="workspace"
         initial={{ opacity: 0, filter: 'blur(10px)' }}
         animate={{ opacity: 1, filter: 'blur(0px)' }}
         exit={{ opacity: 0 }}
         transition={{ duration: 0.8 }}
         className="flex flex-col flex-1 h-full relative z-10"
       >
         {/* Authenticated workspace contents */}
       </motion.div>
     ) : (
       <motion.div
         key="login"
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         exit={{ opacity: 0, filter: 'blur(10px)' }}
         transition={{ duration: 0.8 }}
       >
         <LoginWall />
       </motion.div>
     )}
   </AnimatePresence>
   ```

---

## 3. Button Implementations: [MIC], [HISTORY], [SEND], and Guest Access

### Findings
During the restoration of the "Museum/Installation" aesthetic, several text buttons were replaced by SVG icon-only or simplified Chinese text buttons. The current code compared to the history (commit `22f941e` when text labels were used) shows:

1. **`[MIC]` (Voice Button)**:
   * **Current**: Implemented in `web/src/components/chat/InputBar.tsx` (lines 96-114). It is a motion-button rendering an SVG microphone icon.
   * **History**: Previously, it was a text button rendering `[ MIC ]` and `[ LISTENING ]` based on `isListening`:
     ```tsx
     {isListening ? '[ LISTENING ]' : '[ MIC ]'}
     ```
2. **`[HISTORY]` (History Sidebar Toggle)**:
   * **Current**:
     * **Mobile**: Styled as the text "菜单" (Menu) button in `App.tsx` (line 96-104).
     * **Desktop**: Styled as the text "历史" in `App.tsx` (line 162-171).
   * **History**: Previously, the desktop button rendered the monospace English bracket text `[HISTORY]`, and the mobile button rendered `[MENU]`.
3. **`[SEND]` (Send Message Button)**:
   * **Current**: Implemented in `web/src/components/chat/InputBar.tsx` (lines 135-151). It renders an SVG arrow-up icon inside a circular button.
   * **History**: Previously, it was a text-based monospace button rendering `[ SEND ]`:
     ```tsx
     <button ...> [ SEND ] </button>
     ```
4. **Guest Access (Visitor Log In)**:
   * **Current**: Implemented in `web/src/components/auth/LoginModal.tsx` (lines 338-350) as "访客体验" (Visitor Experience). It calls `handleTestLogin()` which requests the `/api/auth/test-login` endpoint on the backend.
   * **History**: Previously, it was represented as `[ 访客体验 ]` or `[ GUEST ACCESS ]`.

### Proposed Changes
To restore the monospace, text-heavy bracketed UI style (`[MIC]`, `[HISTORY]`, `[SEND]`, `[GUEST ACCESS]`) to fit a tech-noir or minimalist museum look:
1. **InputBar.tsx**:
   * Replace the SVG elements in the voice button (lines 96-114) and send button (lines 135-151) with monospace-styled text nodes:
     * Voice button text: `className="font-mono text-xs tracking-wider"` rendering `{isListening ? '[ LISTENING ]' : '[ MIC ]'}`.
     * Send button text: `className="font-mono text-xs tracking-wider"` rendering `[ SEND ]`.
2. **App.tsx**:
   * Replace the history toggle text "历史" (line 170) with `[HISTORY]` and "菜单" (line 103) with `[MENU]` / `[OUT]`.
3. **LoginModal.tsx**:
   * Replace "访客体验" (line 347) with `[ 访客体验 ]` or `[ GUEST ACCESS ]` using a monospace font class.

---

## 4. Chinese Localization Status

### Findings
* **No Framework**: There is no i18n library (such as `react-i18next`, `react-intl`, or `i18next`) in `package.json` or configuration in the source code.
* **Hardcoded Chinese**: All localization is manually hardcoded into the component files. Examples include:
  * `LoginWall.tsx`: "探索内心 · 寻找平静", "进入", "展览 01", "内心空间"
  * `LoginModal.tsx`: "重新连接你的内心", "一个专为你设计的安全空间...", "登录", "注册", "用户名", "密码", "邀请密钥", "验证中...", "访客体验", error messages ("请输入用户名和密码")
  * `GeminiWelcome.tsx`: "你好，欢迎来到这里", "在这里，你可以放心地说出任何感受...", "开始对话"
  * `EmojiSelector.tsx`: "此时此刻，你处于什么状态？", "挑选一个代表你当下心境的表情包...", "跳过，直接输入文字"
  * `InputBar.tsx`: "正在听...", "思考中...", "向 RE-THINK 提问", disclaimer ("RE-THINK 生成的内容可能不准确。请在需要时寻求专业医疗帮助。")
  * `CrisisOverlay.tsx`: Helpline names ("全国心理援助热线"), descriptions, and call-to-actions.
* **Residual English**: Monospace elements like "RETHINK", "© 2026 The Mind" are kept in English for design/art aesthetics.

### Proposed Changes / i18n Strategy
To implement a clean localization architecture (allowing easy toggle between Chinese and English):
1. **Install Dependencies**:
   Add `i18next` and `react-i18next` to `package.json`.
2. **Create Translation Files**:
   Define JSON dictionaries under `web/src/locales/zh.json` and `web/src/locales/en.json`.
   * **`zh.json` Example**:
     ```json
     {
       "login": {
         "title": "重新连接你的内心",
         "guest": "访客体验"
       },
       "chat": {
         "placeholder": "向 RE-THINK 提问",
         "disclaimer": "RE-THINK 生成的内容可能不准确。请在需要时寻求专业医疗帮助。"
       }
     }
     ```
3. **Configure i18n**:
   Add `web/src/lib/i18n.ts` to initialize `i18next` and load translation resources.
4. **Refactor Components**:
   Use the `useTranslation` hook in React components:
   ```tsx
   import { useTranslation } from 'react-i18next';
   // inside component:
   const { t } = useTranslation();
   // usage:
   placeholder={t('chat.placeholder')}
   ```
5. **Language Switcher**:
   Add a tiny text button `[ ZH / EN ]` in `App.tsx` (e.g. next to the desktop logout pill) to switch languages dynamically using `i18n.changeLanguage()`.
