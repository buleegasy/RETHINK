## 2026-06-19T19:33:06+08:00
You are the teamwork_preview_worker.
Your working directory is /Users/chenhaoran/Documents/心理竞赛/.agents/teamwork_preview_worker_bugfix_2/
Your identity is teamwork_preview_worker_bugfix_2.

Objectives:
Resolve the following issues in the codebase:
1. The esbuild compile tag mismatch in App.tsx (unmatched motion.div closing tag). Inspect `web/src/App.tsx` and ensure that all open tags (like <motion.div>) are matched by their correct closing tags (like </motion.div>).
2. The riskLevel schema property omission in worker/src/routes/chat.ts pre-response (during crisis intent early return). Inspect `worker/src/routes/chat.ts` and ensure that the crisis early-return payload includes the proper riskLevel schema properties (`riskLevel: 'crisis'`, `ragQueried: true`, `ragRetrievalMode: 'forced_safety'`) for both the non-stream JSON and SSE stream responses.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please execute the required changes, perform local verification if possible, and write your handoff report (handoff.md) in your working directory. Report completion back using send_message.
