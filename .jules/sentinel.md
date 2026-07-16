## 2024-05-18 - Hardcoded Production Secrets in Configuration
**Vulnerability:** Found hardcoded `TURNSTILE_SECRET_KEY` and `ADMIN_SECRET_TOKEN` in the production configuration file (`worker/wrangler.toml`).
**Learning:** Developers often place secrets in configuration files during early development for convenience, forgetting that configuration files are committed to version control and thus exposed to anyone with repository access.
**Prevention:** Always use environment variables or a secrets management system (like `wrangler secret put` for Cloudflare Workers) for sensitive data. Add examples of secrets to a `.dev.vars.example` file instead of hardcoding them in the main config.
