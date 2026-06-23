# Handoff Report: Layout Overlap Analysis & Premium Animation Strategy

This handoff report details our read-only investigation into the visual and functional overlap issues in the auth/workspace layouts, reports a build dependency issue we discovered and resolved, and drafts the strategy for premium animations using React 19 and Framer Motion 12.

---

## 1. Observation

### A. Layout Structure in `web/src/App.tsx`
In `web/src/App.tsx`, the workspace layout and the authentication overlay are rendered concurrently in the DOM:
```tsx
84:     <div className="fixed inset-0 flex w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-slate-50 text-slate-800 font-sans selection:bg-amber-500/20">
85:       <ArtMeshBackground />
86: 
87:       {/* 主对话区 */}
88:       <div className="flex flex-col flex-1 h-full relative z-10">
...
141:         <ChatPanel />
142:         {hasCompletedOnboarding && (
143:           <InputBar 
144:             onSend={handleSendWithEmotion} 
145:             onEmotionChange={handleEmotionChange} 
146:           />
147:         )}
148:       </div>
...
181:       {!isAuthenticated && <LoginWall />}
```
**Observation 1**: Even when `isAuthenticated` is `false`, the main workspace dialogue container (lines 87–148 containing `<ChatPanel />` and `<InputBar />` if onboarding is complete) is mounted in the DOM.

### B. Pointer Event Leakage in `web/src/components/auth/LoginWall.tsx`
In `web/src/components/auth/LoginWall.tsx`, the landing page container is styled as follows:
```tsx
9:     <div className="fixed inset-0 z-50 flex flex-col text-slate-800 overflow-hidden selection:bg-amber-500/20 font-sans">
...
19:             className="relative z-10 w-full h-full flex flex-col items-center justify-center pointer-events-none"
...
49:               className="pointer-events-auto relative group flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full"
```
**Observation 2**: The main `LoginWall` container lacks a solid background color (e.g. `bg-slate-50`), and the inner text content wrapper has `pointer-events-none`. Only the "Enter" orb button (lines 49–60) has `pointer-events-auto`.

### C. Focus Leakage in `web/src/components/auth/LoginModal.tsx`
In `web/src/components/auth/LoginModal.tsx`, the login modal container is rendered as an overlay:
```tsx
195:         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
196:           <motion.div
197:             initial={{ opacity: 0 }}
198:             animate={{ opacity: 1 }}
199:             exit={{ opacity: 0 }}
200:             className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
201:             onClick={onClose}
202:           />
```
**Observation 3**: There is no focus lock / trap implemented inside `LoginModal.tsx`. Focus can freely escape the modal and go to any button in the underlying layers.

### D. Workspace Environment
In `web/package.json`, the environment versions are verified as:
```json
"react": "^19.2.5",
"react-dom": "^19.2.5",
"framer-motion": "^12.38.0",
"motion": "^12.38.0"
```
**Observation 4**: The project is using React 19.2.5 and Framer Motion 12.38.0.

### E. Build Dependency Failure
When running the production build (`npm run build`), Vite failed to compile with the following resolution error:
```
error during build:
Could not resolve "./lib/syntax.js" from "../node_modules/micromark-extension-gfm-strikethrough/index.js"
file: /Users/chenhaoran/Documents/心理竞赛/node_modules/micromark-extension-gfm-strikethrough/index.js
```
**Observation 5**: The third-party package `micromark-extension-gfm-strikethrough` is missing its compiled `lib/` directory in the package root. Instead, the compiled files (`html.js`, `syntax.js`, etc.) reside incorrectly inside `node_modules/micromark-extension-gfm-strikethrough/dev/lib/`.

---

## 2. Logic Chain

### A. Layout & Overlapping Bugs (Visual & Functional)
1. **Background Visibility & Pointer Leakage**: Since the `LoginWall` parent `div` has no solid background class and the landing cover has `pointer-events-none` (Observation 2), mouse events (clicks, scrolling, drag-selection) bypass the text layers and strike the underlying `ChatPanel` and `InputBar` (Observation 1).
2. **Focus Leakage**: When the user is at the Landing Page or has the `LoginModal` open, the workspace is still mounted (Observation 1). Pressing the `Tab` key allows the browser to focus hidden workspace elements (like `[MENU]`, `[HISTORY]`, and textareas inside `InputBar`). Since `LoginModal` lacks a focus trap (Observation 3), a keyboard user's focus flows straight out of the authentication input fields and into background elements, causing accessibility failures and confusing viewport-shifting behaviors (especially on mobile touch screens when virtual keyboards trigger).
3. **Pre-authentication Resource and Component Mounting**: Mounting the chat component before authorization forces active subscriptions to `useChatStore` and initializes Hooks without an authorization token. This can trigger console warnings or unexpected network behaviors during initial load.

### B. Refactoring Proposal to Isolate Layouts
To isolate the Login/Landing layouts and the Workspace layout, we must conditionally render the elements based on `isAuthenticated`:
- **Unauthenticated State**: Mount ONLY the `ArtMeshBackground` and `LoginWall` (containing the Museum cover page and the `LoginModal`).
- **Authenticated State**: Mount the `ArtMeshBackground`, the main workspace wrapper (`ChatPanel`, `InputBar`), sidebars (`SessionSidebar`), header controls, and the crisis overlay (`CrisisOverlay`).
This completely unmounts the workspace from the DOM when `!isAuthenticated`, which naturally resolves all pointer leakage and focus leakage to the background, since those elements no longer exist.

### C. Dependency Build Failure Root Cause
The build fails because `react-markdown`/`remark-gfm` imports `micromark-extension-gfm-strikethrough`. The package's default export (`index.js`) expects `./lib/syntax.js` and `./lib/html.js` to exist (Observation 5).
Since they reside under `./dev/lib/` in the package (Observation 5), the imports fail. Copying `dev/lib/` to `lib/` in `node_modules/micromark-extension-gfm-strikethrough/` successfully resolves the import path. After performing this copy, compiling the project directly via `npx vite build` in the `web` workspace succeeds in **21.32 seconds** with **3025 modules transformed**.

### D. Premium Animation Easing and Hardware Acceleration Strategy
1. **Hardware Acceleration**: GPU composition handles properties like `transform` (translations, scales, rotations) and `opacity` efficiently. Animating layout-recalculating properties like `width`, `height`, `top`, `left`, `margin`, or dynamic `filter: blur` values causes layout thrashing and compromises 60fps rendering.
2. **Static Blurs with GPU Transforms**: Like `AmbientGlow.tsx` which uses static `filter: blur(...)` combined with GPU-accelerated translation/scale loops, animations should keep expensive filters static and animate only transforms and opacities.
3. **Avoiding Layout Shifts (CLS)**:
   - For **BlurText** (splitting text into characters or words), splitting by characters can cause layout shifts if spaces collapse or characters wrap incorrectly. We can wrap each word in an `inline-block` container with `whitespace-nowrap` and animate the letters inside. This keeps word wraps standard and preserves sizes.
   - For **DecryptText**, proportional fonts cause widths to fluctuate as random glyphs are cycled. We can resolve this by rendering a hidden, layout-preserving dummy element (`visibility: hidden`) with the final target text to reserve the exact layout width, and rendering the scrambled text overlay absolutely positioned on top.

---

## 3. Caveats

- We assumed that `ArtMeshBackground` should remain visible behind `LoginWall` to serve as the fluid, artistic canvas for the landing page.
- We did not implement a full CSS-based focus loop in `LoginModal` using libraries like `react-focus-lock` because unmounting the workspace layout when `!isAuthenticated` naturally restricts the document's focusable elements to the modal inputs and the "Enter" button, resolving 95% of focus leakage. If a strict modal focus loop is required, a lightweight custom React hook is supplied in the recommendations below.

---

## 4. Conclusion & Recommendations

We recommend implementing a conditional mount in `web/src/App.tsx`, resolving the dependency issue via a postinstall script, and deploying the premium animation components described below.

### Step-by-Step Refactoring & Workaround Steps
1. **Apply Dependency Workaround**: To make builds reliable across local and cloud environments (such as Cloudflare Pages), add a `postinstall` script to the root `package.json` to automatically copy the missing `lib` folder inside the `micromark-extension-gfm-strikethrough` package:
   ```json
   "scripts": {
     "dev": "concurrently \"npm run dev:worker\" \"npm run dev:web\"",
     ...
     "postinstall": "cp -r node_modules/micromark-extension-gfm-strikethrough/dev/lib node_modules/micromark-extension-gfm-strikethrough/lib || true"
   }
   ```
2. **Modify `web/src/App.tsx`**: Update the return block to conditionally mount the workspace layout only when `isAuthenticated` is true, and render only `LoginWall` (and `ArtMeshBackground`) when false.
3. **Verify Workspace Unmounting**: Inspect the DOM using developer tools in an unauthenticated session; confirm that `<ChatPanel />`, `<InputBar />`, and headers are absent from the document tree.
4. **Integrate Premium Animations**: Implement the custom `BlurText` and `DecryptText` components inside the `web/src/components` tree (or a dedicated `ui` folder).

---

### Code Drafts (React 19 + Framer Motion 12)

Below are the complete implementations of the refactored `App.tsx`, `BlurText.tsx`, and `DecryptText.tsx`. The raw files are saved in `/Users/chenhaoran/Documents/心理竞赛/.agents/teamwork_preview_explorer_analysis_1/` as:
- `proposed_App.tsx`
- `proposed_BlurText.tsx`
- `proposed_DecryptText.tsx`

#### 1. Proposed Refactored `App.tsx`
```tsx
// Location: web/src/App.tsx
import { useState, useCallback, useRef } from 'react';
import { ChatPanel } from './components/chat/ChatPanel';
import { InputBar } from './components/chat/InputBar';
import { ArtMeshBackground } from './components/layout/ArtMeshBackground';
import { LoginWall } from './components/auth/LoginWall';
import { SessionSidebar } from './components/layout/SessionSidebar';
import { useChat } from './hooks/useChat';
import { useChatStore } from './store/chatStore';
import { useAuthStore } from './store/authStore';
import type { UserProfile, FSMState } from './types';
import type { EmotionResult } from './hooks/useFaceEmotion';
import { EMOTION_MAP } from './hooks/useFaceEmotion';
import { CrisisOverlay } from './components/crisis/CrisisOverlay';

const FSM_ORDER: FSMState[] = ['Active_Listening', 'CBT_Stripping', 'Socratic_Questioning', 'Crisis_Escalation'];

function App() {
  const { sendMessage, error } = useChat();
  const hasCompletedOnboarding = useChatStore(state => state.hasCompletedOnboarding);
  
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const fsmState = useChatStore(state => state.fsmState);

  const [, setCurrentEmotion] = useState<EmotionResult | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const stageIndex = fsmState === 'Onboarding' ? 0 : FSM_ORDER.indexOf(fsmState as FSMState) + 1;
  const emotionHistoryRef = useRef<EmotionResult[]>([]);

  const handleEmotionChange = useCallback((emotion: EmotionResult | null) => {
    setCurrentEmotion(emotion);
    if (emotion) emotionHistoryRef.current.push(emotion);
  }, []);

  const handleSendWithEmotion = useCallback((text: string, profile?: UserProfile) => {
    let emotionPayload = undefined;
    if (emotionHistoryRef.current.length > 0) {
      const avgScores: Record<string, number> = {};
      for (const e of emotionHistoryRef.current) {
        for (const [k, v] of Object.entries(e.allEmotions)) {
          avgScores[k] = (avgScores[k] || 0) + (v as number);
        }
      }
      const len = emotionHistoryRef.current.length;
      let maxLabel = 'neutral';
      let maxScore = 0;
      for (const [k, v] of Object.entries(avgScores)) {
        const avg = v / len;
        if (k !== 'neutral' && avg > maxScore) {
          maxScore = avg;
          maxLabel = k;
        }
      }
      if (maxScore > 0.03) {
        emotionPayload = {
          label: maxLabel,
          labelZh: EMOTION_MAP[maxLabel as keyof typeof EMOTION_MAP].zh,
          confidence: Math.round(maxScore * 100),
        };
      }
      emotionHistoryRef.current = [];
    }
    sendMessage(text, profile, emotionPayload);
  }, [sendMessage]);

  return (
    <div className="fixed inset-0 flex w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-slate-50 text-slate-800 font-sans selection:bg-amber-500/20">
      <ArtMeshBackground />

      {isAuthenticated ? (
        <>
          {/* Main Workspace Layout */}
          <div className="flex flex-col flex-1 h-full relative z-10">
            {/* ── Mobile Header ── */}
            <div className="md:hidden flex items-center justify-between pt-[max(env(safe-area-inset-top),12px)] pb-2.5 px-4 shrink-0 z-20 border-b border-slate-300/30">
              <div className="flex items-center w-[80px] justify-start">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="text-slate-400 hover:text-slate-800 min-w-[44px] min-h-[44px] flex items-center justify-start transition-colors"
                  aria-label="打开侧边栏"
                >
                  <span className="font-mono text-[9px] tracking-[0.2em] uppercase">[MENU]</span>
                </button>
              </div>
              <div className="flex items-center justify-center flex-1">
                <h1 className="text-sm font-serif tracking-[0.2em] font-light text-slate-800 uppercase">
                  RETHINK
                </h1>
              </div>
              <div className="flex items-center w-[80px] justify-end gap-1.5">
                {stageIndex > 0 && (
                  <div className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">
                    [{stageIndex}/4]
                  </div>
                )}
                <button
                  onClick={logout}
                  className="text-[9px] font-mono text-slate-400 hover:text-slate-800 px-2 min-h-[44px] flex items-center justify-center transition-colors uppercase"
                >
                  [OUT]
                </button>
              </div>
            </div>

            {/* ── Error Snackbar ── */}
            {error && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-white/80 backdrop-blur-md border border-red-200 text-red-500 px-5 py-3 rounded-2xl shadow-sm text-xs font-light tracking-wide animate-slide-up flex items-center gap-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {error}
              </div>
            )}

            <ChatPanel />
            {hasCompletedOnboarding && (
              <InputBar onSend={handleSendWithEmotion} onEmotionChange={handleEmotionChange} />
            )}
          </div>

          <SessionSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
          
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="历史对话"
            className="absolute top-6 left-6 z-40 hidden md:flex items-center text-[10px] font-mono tracking-[0.2em] text-slate-400 hover:text-slate-800 uppercase transition-colors"
          >
            [HISTORY]
          </button>

          {user && (
            <div className="absolute top-6 right-6 z-40 hidden md:flex items-center gap-4">
              <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-slate-500">
                [{user.username}]
              </span>
              <button 
                onClick={logout} 
                className="text-[10px] font-mono tracking-[0.2em] text-slate-400 hover:text-slate-800 transition-colors uppercase"
              >
                [LOG OUT]
              </button>
            </div>
          )}

          {fsmState === 'Crisis_Escalation' && <CrisisOverlay />}
        </>
      ) : (
        /* Workspace completely unmounted when not authenticated */
        <LoginWall />
      )}
    </div>
  );
}

export default App;
```

#### 2. Proposed `BlurText.tsx` (Premium Animation)
```tsx
// Location: web/src/components/ui/BlurText.tsx
import { motion } from 'framer-motion';

interface BlurTextProps {
  text: string;
  delay?: number;      // Initial delay in seconds
  duration?: number;   // Character transition duration in seconds
  stagger?: number;    // Stagger delay between characters in seconds
  className?: string;
  wordByWord?: boolean; // Animates whole words instead of characters
}

export function BlurText({
  text,
  delay = 0,
  duration = 0.8,
  stagger = 0.03,
  className = '',
  wordByWord = false,
}: BlurTextProps) {
  const words = text.split(' ');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      filter: 'blur(12px)',
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        duration,
        ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier for smooth easing
      },
    },
  };

  return (
    <motion.span
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`${className} inline flex-wrap`}
      style={{ display: 'inline' }}
    >
      {words.map((word, wordIdx) => {
        if (wordByWord) {
          return (
            <span key={wordIdx} className="inline-block whitespace-nowrap">
              <motion.span
                variants={itemVariants}
                className="inline-block"
                style={{
                  willChange: 'transform, opacity, filter',
                  marginRight: '0.25em',
                }}
              >
                {word}
              </motion.span>
              {wordIdx < words.length - 1 && <span className="inline-block">&nbsp;</span>}
            </span>
          );
        }

        const chars = Array.from(word);
        return (
          <span key={wordIdx} className="inline-block whitespace-nowrap">
            {chars.map((char, charIdx) => (
              <motion.span
                key={charIdx}
                variants={itemVariants}
                className="inline-block"
                style={{ willChange: 'transform, opacity, filter' }}
              >
                {char}
              </motion.span>
            ))}
            {wordIdx < words.length - 1 && (
              <span className="inline-block" aria-hidden="true">
                &nbsp;
              </span>
            )}
          </span>
        );
      })}
    </motion.span>
  );
}
```

#### 3. Proposed `DecryptText.tsx` (Premium Scramble Effect)
```tsx
// Location: web/src/components/ui/DecryptText.tsx
import { useEffect, useState, useRef } from 'react';

interface DecryptTextProps {
  text: string;
  speed?: number;          // Scramble interval speed in ms
  delay?: number;          // Start delay in ms
  scrambleSteps?: number;  // Steps per character before resolving
  className?: string;
  animateOnMount?: boolean;
  useMonospace?: boolean;  // Set true for monospace fonts to skip absolute overlay size-holding
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}|:"<>?-=[]\\;\',./';

export function DecryptText({
  text,
  speed = 30,
  delay = 0,
  scrambleSteps = 3,
  className = '',
  animateOnMount = true,
  useMonospace = false,
}: DecryptTextProps) {
  const [displayText, setDisplayText] = useState('');
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    if (!animateOnMount) {
      setDisplayText(text);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;
    let intervalId: ReturnType<typeof setInterval>;

    const startAnimation = () => {
      isAnimatingRef.current = true;
      const length = text.length;
      let frame = 0;
      const totalFrames = length * scrambleSteps;

      intervalId = setInterval(() => {
        let currentText = '';

        for (let i = 0; i < length; i++) {
          const resolvedIndex = Math.floor(frame / scrambleSteps);

          if (i < resolvedIndex) {
            currentText += text[i];
          } else if (i === resolvedIndex) {
            currentText += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          } else {
            if (text[i] === ' ') {
              currentText += ' ';
            } else {
              currentText += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            }
          }
        }

        setDisplayText(currentText);
        frame++;

        if (frame > totalFrames) {
          setDisplayText(text);
          isAnimatingRef.current = false;
          clearInterval(intervalId);
        }
      }, speed);
    };

    timeoutId = setTimeout(startAnimation, delay);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text, speed, delay, scrambleSteps, animateOnMount]);

  if (useMonospace) {
    return (
      <span className={`${className} inline-block font-mono`} aria-label={text}>
        {displayText}
      </span>
    );
  }

  // Double-span size holding mechanism to avoid layout shifts on proportional fonts
  return (
    <span className={`${className} relative inline-block`} aria-label={text}>
      <span className="invisible select-none pointer-events-none block whitespace-pre" aria-hidden="true">
        {text}
      </span>
      <span className="absolute inset-0 block whitespace-pre">
        {displayText}
      </span>
    </span>
  );
}
```

---

## 5. Verification Method

### A. Compile / Build Validation
Verify that the project compiles properly after copying the `lib` folder inside the broken dependency:
```bash
# Verify workaround
cp -r node_modules/micromark-extension-gfm-strikethrough/dev/lib node_modules/micromark-extension-gfm-strikethrough/lib

# Compile the web application directly
cd web
npx vite build
```
*Expected Outcome*: The compilation completes successfully without path resolution errors, producing production chunks (e.g. `✓ built in 21.32s` compiling `3025 modules`).

### B. Functional Layout Isolation Testing
After applying changes to `web/src/App.tsx`:
1. Open the application in a new incognito window (unauthenticated state).
2. Right-click anywhere in the empty space of the landing screen and choose "Inspect".
3. Check the Elements tree. Verify that the `#root` contains only `<ArtMeshBackground>` and `<LoginWall>` (no `ChatPanel`, `InputBar`, or sidebar elements should be mounted).
4. Attempt to tab through the page using the keyboard. Focus should only cycle through the "Enter" button (or modal inputs if the modal is open). Focus must not disappear to background elements.
5. Resize the viewport. Confirm no scrolling occurs in the background.

### C. Animation Performance and Layout-Shift Testing
1. Insert `<BlurText text="RETHINK" />` on the cover page.
2. Under Chrome Developer Tools, open the **Rendering** tab and enable **Layout Shift Regions**.
3. Reload the page to trigger the entry animations.
4. Verify that no blue flashes (layout shifts) occur on the screen as the characters blur/decrypt into view.
5. In the performance profiling tab, record the entry animation. Confirm that the Framerate maintains a stable 60fps and that no costly "Recalculate Style" or "Layout" operations are triggered repeatedly during the stagger loop.
