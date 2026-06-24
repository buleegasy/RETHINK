## Forensic Audit Report

**Work Product**: `/Users/chenhaoran/工程文件/心理大赛/web`
**Profile**: General Project
**Verdict**: INTEGRITY VIOLATION

### Phase Results
- **Login Wall Mutually Exclusive Rendering**: PASS — Mutually exclusive rendering is correctly implemented in `src/App.tsx` using `{isAuthenticated ? (...) : (<LoginWall />)}` (and similarly `if (!isAuthenticated) return <LoginWall />;`). It completely unmounts workspace components when not authenticated. No hardcoded authentication bypasses or fake validation results exist.
- **Background Component Removal & Idle Resource Check**: FAIL — While `ArtMeshBackground.tsx` (ThreeJS) has been successfully deleted from disk and removed from rendering, `AmbientGlow` is still imported and rendered in both `src/App.tsx` (line 89) and `src/components/auth/LoginWall.tsx` (line 14). `AmbientGlow` runs active Framer Motion layout animations on idle, violating the requirement of completely removing both components and running 0% CPU/GPU backgrounds on idle.
- **Action Labels Icons & Localization**: FAIL — The square brackets have been removed, and all user-facing strings are successfully translated to Chinese. However, in `src/App.tsx`, the action labels `[MENU]`, `[HISTORY]`, and `[OUT]` were replaced by plain Chinese text labels/spans (`菜单`, `历史`, `退出`) rather than genuine icon components as required. Only `[MIC]` and `[SEND]` in `InputBar.tsx` were replaced with genuine icon components (`Mic` and `SendHorizontal`).
- **General Integrity Check**: FAIL — The codebase fails to meet the explicit specifications in the acceptance criteria, constituting an integrity mismatch (facade replacement of icon requirements with raw text, and incomplete background cleanup).

---

### Evidence

#### 1. App.tsx Render and Import of AmbientGlow
From `web/src/App.tsx`:
```typescript
6: import { AmbientGlow } from './components/layout/AmbientGlow';
...
85:     <div className="fixed inset-0 flex w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-surface-dim/40 text-on-surface font-sans selection:bg-gemini-blue/20">
86:       {isAuthenticated ? (
87:         <>
88:           {/* Authenticated: show fluid art background + workspace */}
89:           <AmbientGlow />
```

#### 2. LoginWall.tsx Render and Import of AmbientGlow
From `web/src/components/auth/LoginWall.tsx`:
```typescript
6: import { AmbientGlow } from '../layout/AmbientGlow';
...
13:     <div className="fixed inset-0 z-50 flex flex-col text-on-surface overflow-hidden selection:bg-gemini-blue/20 font-sans">
14:       <AmbientGlow forceShow={true} />
```

#### 3. AmbientGlow.tsx Idle Animations
From `web/src/components/layout/AmbientGlow.tsx` showing active Framer Motion loop animations on idle:
```typescript
27:             animate={{
28:               x: [0, 150, -100, 0],
29:               y: [0, -80, 100, 0],
30:               scale: [1, 1.3, 0.8, 1],
31:             }}
32:             transition={{
33:               duration: 8,
34:               repeat: Infinity,
35:               ease: 'easeInOut',
36:             }}
```

#### 4. App.tsx Action Labels Replaced with Text instead of Icons
From `web/src/App.tsx` showing replacement of `[MENU]`, `[HISTORY]`, and `[OUT]` with raw text labels:
```typescript
96:                 <motion.button
...
103:                   <span className="text-[11px] tracking-wide text-on-surface-variant">菜单</span>
104:                 </motion.button>
...
162:           <motion.button
...
170:             历史
171:           </motion.button>
...
179:               <motion.button 
...
185:                 退出
186:               </motion.button>
```

#### 5. Unstaged Git Diff for web/src/App.tsx
```diff
diff --git a/web/src/App.tsx b/web/src/App.tsx
--- a/web/src/App.tsx
+++ b/web/src/App.tsx
@@ -1,8 +1,9 @@
 import { useState, useCallback, useRef } from 'react';
+import { motion } from 'framer-motion';
 
 import { ChatPanel } from './components/chat/ChatPanel';
 import { InputBar } from './components/chat/InputBar';
-import { ArtMeshBackground } from './components/layout/ArtMeshBackground';
+import { AmbientGlow } from './components/layout/AmbientGlow';
 import { LoginWall } from './components/auth/LoginWall';
 import { SessionSidebar } from './components/layout/SessionSidebar';
 import { useChat } from './hooks/useChat';
@@ -81,107 +82,118 @@ function App() {
   }, [sendMessage]);
 
   return (
-    <div className="fixed inset-0 flex w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-slate-50 text-slate-800 font-sans selection:bg-amber-500/20">
-      <ArtMeshBackground />
-
-      {/* 主对话区 */}
-      <div className="flex flex-col flex-1 h-full relative z-10">
-        {/* ── 移动端顶部 Header ── */}
-        <div className="md:hidden flex items-center justify-between pt-[max(env(safe-area-inset-top),12px)] pb-2.5 px-4 shrink-0 z-20 border-b border-slate-300/30">
-          {/* 左侧：Hamburger 菜单 */}
-          <div className="flex items-center w-[80px] justify-start">
-            {isAuthenticated && (
-              <button
-                onClick={() => setSidebarOpen(true)}
-                className="text-slate-400 hover:text-slate-800 min-w-[44px] min-h-[44px] flex items-center justify-start transition-colors"
-                aria-label="打开侧边栏"
-              >
-                <span className="font-mono text-[9px] tracking-[0.2em] uppercase">[MENU]</span>
-              </button>
-            )}
-          </div>
+    <div className="fixed inset-0 flex w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-surface-dim/40 text-on-surface font-sans selection:bg-gemini-blue/20">
+      {isAuthenticated ? (
+        <>
+          {/* Authenticated: show fluid art background + workspace */}
+          <AmbientGlow />
+          {/* 主对话区 (Workspace Layout) */}
+          <div className="flex flex-col flex-1 h-full relative z-10">
+            {/* ── 移动端顶部 Header ── */}
+            <div className="md:hidden flex items-center justify-between pt-[max(env(safe-area-inset-top),12px)] pb-2.5 px-4 shrink-0 z-20 border-b border-outline-variant/30">
+              {/* 左侧：Hamburger 菜单 */}
+              <div className="flex items-center w-[80px] justify-start">
+                <motion.button
+                  whileHover={{ scale: 1.05 }}
+                  whileTap={{ scale: 0.95 }}
+                  onClick={() => setSidebarOpen(true)}
+                  className="text-on-surface-variant hover:text-on-surface min-w-[44px] min-h-[44px] flex items-center justify-start transition-colors cursor-pointer"
+                  aria-label="打开侧边栏"
+                >
+                  <span className="text-[11px] tracking-wide text-on-surface-variant">菜单</span>
+                </motion.button>
+              </div>
 
-          {/* 中间：品牌 */}
-          <div className="flex items-center justify-center flex-1">
-            <h1 className="text-sm font-serif tracking-[0.2em] font-light text-slate-800 uppercase">
-              RETHINK
-            </h1>
-          </div>
+              {/* 中间：品牌 */}
+              <div className="flex items-center justify-center flex-1">
+                <h1 className="text-sm font-serif tracking-[0.2em] font-light text-on-surface uppercase">
+                  RETHINK
+                </h1>
+              </div>
 
-          {/* 右侧：阶段药丸 + 退出 */}
-          <div className="flex items-center w-[80px] justify-end gap-1.5">
-            {stageIndex > 0 && (
-              <div className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">
-                [{stageIndex}/4]
+              {/* 右侧：阶段药丸 + 退出 */}
+              <div className="flex items-center w-[80px] justify-end gap-1.5">
+                {stageIndex > 0 && (
+                  <div className="text-[11px] tracking-wide text-on-surface-variant">
+                    {stageIndex}/4
+                  </div>
+                )}
+                <motion.button
+                  whileHover={{ scale: 1.05 }}
+                  whileTap={{ scale: 0.95 }}
+                  onClick={logout}
+                  className="text-[11px] text-on-surface-variant hover:text-on-surface px-2 min-h-[44px] flex items-center justify-center transition-colors cursor-pointer"
+                >
+                  退出
+                </motion.button>
               </div>
-            )}
-            {isAuthenticated && (
-              <button
-                onClick={logout}
-                className="text-[9px] font-mono text-slate-400 hover:text-slate-800 px-2 min-h-[44px] flex items-center justify-center transition-colors uppercase"
+            </div>
+
+            {/* ── 错误 Snackbar ── */}
+            {error && (
+              <motion.div 
+                initial={{ opacity: 0, y: -20, x: "-50%" }}
+                animate={{ opacity: 1, y: 0, x: "-50%" }}
+                transition={{ type: "spring", stiffness: 350, damping: 20 }}
+                className="absolute top-4 left-1/2 z-50 bg-error-container/95 backdrop-blur-md border border-error/20 text-error px-5 py-3 rounded-2xl shadow-md text-xs font-light tracking-wide flex items-center gap-2.5"
               >
-                [OUT]
-              </button>
+                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
+                  <circle cx="12" cy="12" r="10"></circle>
+                  <line x1="12" y1="8" x2="12" y2="12"></line>
+                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
+                </svg>
+                {error}
+              </motion.div>
+            )}
+
+            <ChatPanel />
+            {hasCompletedOnboarding && (
+              <InputBar 
+                onSend={handleSendWithEmotion} 
+                onEmotionChange={handleEmotionChange} 
+              />
             )}
           </div>
-        </div>
-
-        {/* ── 错误 Snackbar ── */}
-        {error && (
-          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-white/80 backdrop-blur-md border border-red-200 text-red-500 px-5 py-3 rounded-2xl shadow-sm text-xs font-light tracking-wide animate-slide-up flex items-center gap-2.5">
-            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
-              <circle cx="12" cy="12" r="10"></circle>
-              <line x1="12" y1="8" x2="12" y2="12"></line>
-              <line x1="12" y1="16" x2="12.01" y2="16"></line>
-            </svg>
-            {error}
-          </div>
-        )}
-
-        <ChatPanel />
-        {hasCompletedOnboarding && (
-          <InputBar 
-            onSend={handleSendWithEmotion} 
-            onEmotionChange={handleEmotionChange} 
-          />
-        )}
-      </div>
-
-      {/* ── Session History Sidebar ── */}
-      {isAuthenticated && <SessionSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />}
-      
-      {/* ── Desktop History Button ── */}
-      {isAuthenticated && (
-        <button
-          type="button"
-          onClick={() => setSidebarOpen(true)}
-          aria-label="历史对话"
-          className="absolute top-6 left-6 z-40 hidden md:flex items-center text-[10px] font-mono tracking-[0.2em] text-slate-400 hover:text-slate-800 uppercase transition-colors"
-        >
-          [HISTORY]
-        </button>
-      )}
 
-      {/* ── Desktop Profile Pill ── */}
-      {isAuthenticated && user && (
-        <div className="absolute top-6 right-6 z-40 hidden md:flex items-center gap-4">
-          <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-slate-500">
-            [{user.username}]
-          </span>
-          <button 
-            onClick={logout} 
-            className="text-[10px] font-mono tracking-[0.2em] text-slate-400 hover:text-slate-800 transition-colors uppercase"
+          {/* ── Session History Sidebar ── */}
+          <SessionSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
+          
+          {/* ── Desktop History Button ── */}
+          <motion.button
+            whileHover={{ scale: 1.05 }}
+            whileTap={{ scale: 0.95 }}
+            type="button"
+            onClick={() => setSidebarOpen(true)}
+            aria-label="历史对话"
+            className="absolute top-6 left-6 z-40 hidden md:flex items-center text-[11px] tracking-wide text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
           >
-            [LOG OUT]
-          </button>
-        </div>
+            历史
+          </motion.button>
+
+          {/* ── Desktop Profile Pill ── */}
+          {user && (
+            <div className="absolute top-6 right-6 z-40 hidden md:flex items-center gap-4">
+              <span className="text-[11px] tracking-wide text-on-surface-variant">
+                {user.username}
+              </span>
+              <motion.button 
+                whileHover={{ scale: 1.05 }}
+                whileTap={{ scale: 0.95 }}
+                onClick={logout} 
+                className="text-[11px] tracking-wide text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
+              >
+                退出
+              </motion.button>
+            </div>
+          )}
+
+          {/* 危机干预覆盖层 */}
+          {fsmState === 'Crisis_Escalation' && <CrisisOverlay />}
+        </>
+      ) : (
+        /* Render ONLY LoginWall if not authenticated. Workspace elements are completely unmounted. */
+        <LoginWall />
       )}
-
-      {/* 登录、验证码墙 */}
-      {!isAuthenticated && <LoginWall />}
-
-      {/* 危机干预覆盖层 */}
-      {fsmState === 'Crisis_Escalation' && <CrisisOverlay />}
     </div>
   );
 }
```
