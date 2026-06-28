# Project: Restore & Upgrade Premium Streaming Glow Effect

## Architecture
This project restores and upgrades the premium "streaming glow" (流光) animation effect on the background and AI message bubbles.
To prevent performance regressions during message streaming, the rendering complexity of these animations must remain at $O(1)$, fully decoupled from the core React rendering cycle by deferring to CSS transitions, conic-gradients, keyframe animations, Canvas, or WebGL.

- **Background Animation**: Global background wrapper in the chat app.
- **AI Message Bubbles**: Specifically during generating/streaming states in the chat dialogue interface.
- **Performance Constraints**: Must not cause global React state re-rendering loops or high CPU usage.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Research & Discovery | Locate background/bubble components, identify previous implementation, and research O(1) glow designs | None | DONE |
| 2 | Implementation | Implement CSS/Canvas/WebGL-based premium glow effects decoupled from React render loops | M1 | DONE |
| 3 | Review & Challenger Testing | Verify rendering complexity is O(1) and check visual fluidness and performance | M2 | DONE |
| 4 | Forensic Audit | Verify code integrity and check for any performance regressions | M3 | DONE |

## Interface Contracts
- **Message Bubble Streaming State**: The component showing message bubbles must display the streaming glow animation when the message `isGenerating` or `isStreaming` is true, without causing the entire message list or parent components to continuously re-render.
- **Animation Easing**: Use cubic-bezier easing (`cubic-bezier(0.4, 0, 0.2, 1)`) and hardware-accelerated transforms/opacity for premium feel, as specified in `motion-skill`.
