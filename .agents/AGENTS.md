# Project-Scoped Rules: RE-THINK Agent

## 1. Build & Deployment Rules
- **Optimize build performance**: When deploying to platforms like Cloudflare Pages, run the build command directly (e.g. `vite build`) instead of chaining slow type-checking commands (like `tsc -b`) to prevent environment deployment timeouts.
- **Maintain pristine lockfiles**: Always clean and regenerate `package-lock.json` when adding packages that clash with existing lock conditions to guarantee deterministic dependencies and avoid deployment-time install hangs.

## 2. Directory & Path Rules
- **Pristine Development Workspace**: All active project development, file writes, and code changes must take place in `/Users/chenhaoran/工程文件/心理大赛` (the active development workspace). Do **NOT** write files or perform modifications in the deprecated iCloud backup folder (`/Users/chenhaoran/Documents/心理大赛_iCloud原备份(已废弃只读)`) or other system/temporary folders.
