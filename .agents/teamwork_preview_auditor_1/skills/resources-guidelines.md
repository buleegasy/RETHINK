# Motion Skill Guidelines: Leveraging ReactBits.dev

This guide explains how to effectively integrate components from `reactbits.dev` into your workflow.

## 1. Browsing and Selection
Use your browser subagent to visit [reactbits.dev/docs](https://reactbits.dev/docs) to browse categories:
- **Text**: Transitions, glitch effects, focus effects.
- **Backgrounds**: Animated gradients, particle systems, interactive grids.
- **Components**: Modals, cards, and buttons with creative motion.

## 2. Extraction and Implementation
When you find a component you want to use:
1. **Read Documentation**: Use `read_url_content` or `read_browser_page` to get the source code.
2. **Choose Variant**: `reactbits.dev` usually provides JS/TS and CSS/Tailwind variants. Choose the one that matches the project's current stack.
3. **Adapt for Project**:
   - Install required dependencies if missing (usually `framer-motion`, `gsap`, or `react-spring`).
   - Standardize the styling to match the project's `index.css` or design system.
   - Refactor hardcoded values into props for reusability.

## 3. Principles of Premium Motion
- **Easing**: Avoid `linear` or standard `ease`. Use `cubic-bezier(0.4, 0, 0.2, 1)` or spring-based physics.
- **Micro-interactions**: Add hover states, active states, and focus states that feel tactile.
- **Staggering**: When animating lists, stagger the entry of items for a more professional feel.
- **Responsiveness**: Ensure animations work well on mobile and don't overlap with critical UI elements.

## 4. WebGL / Three.js Fluid Backgrounds
- **Edge Distortion Compensation**: When deforming a mesh in a vertex shader (e.g., fluid flow or waves), scale the mesh up significantly (e.g., `scale={[viewport.width * 2.0, viewport.height * 2.0, 1]}`) relative to the viewport. This prevents deformed edges from pulling inward and exposing the black Canvas background.
- **Depth Sorting & Transparency**: Avoid setting `transparent={true}` on large shader meshes if they are overlaid with particle systems (like Drei `<Sparkles>`). Keep `transparent={false}` or adjust depth writing (`depthWrite={false}`) to resolve flickering black artifacts.
