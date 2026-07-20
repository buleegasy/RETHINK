## 2024-07-20 - Targeted Zustand Selectors for Streaming
**Learning:** Subscribing to the entire `messages` array in components that only need specific nested properties (like `AmbientGlow` needing `techChain`) causes severe performance bottlenecks, as text streaming updates the array on every single token.
**Action:** Always use targeted Zustand selectors that extract specific nested objects. Because `updateLastMessage` preserves the `techChain` reference, a targeted selector returns the same reference during streaming, bypassing unnecessary React re-renders.
