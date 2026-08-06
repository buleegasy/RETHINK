# Project: RE-THINK Pre-Info Collection, Cross-Session Memory & Receptionist Diversity (前置信息收集, 跨对话 Memory 与开场白优化)

## Architecture
- **Full-Stack Monorepo**: Cloudflare Workers backend (`worker/` powered by Hono + D1 SQLite) and React 19 frontend (`web/` powered by Zustand + Vite + Tailwind CSS).
- **State Machine Architecture (`FSMState`)**:
  - `Pre_Info_Collection`: Initial receptionist state asking for user's name/nickname (skipped automatically if user memory exists).
  - `Active_Listening`: Empathetic active listening (formal CBT Stage 1).
  - `CBT_Stripping`: ABC model fact stripping (Stage 2).
  - `Socratic_Questioning`: Socratic questioning & cognitive restructuring (Stage 3).
  - `Crisis_Escalation`: Irreversible crisis lockdown state providing emergency resources.
- **Cross-Session Memory Architecture (R3 - Decoupled Design)**:
  - **Memory Service (`worker/src/lib/memory.ts`)**: Decoupled module managing `user_memories` D1 table (`user_id`, `session_id`, `memory_key`, `memory_value`, `created_at`).
  - **Cross-Session Retrieval**: On `POST /api/chat` for a new session, the system checks `user_memories` for `userName`. If found, `fsmCtx.preInfo` is pre-populated and `collectionCompleted` is set to `true`, smoothly bypassing name prompt while retaining name addressing in counseling prompts.
  - **Deletion Synchronization**: On `DELETE /api/auth/sessions/:id`, the backend clean-clears all associated `user_memories` entries tied to that session.
- **Tone, Diversity & Prohibited Word Protection (R4)**:
  - **Greeting Diversity**: Multi-candidate receptionist greetings with natural, warm phrasing (`RECEPTIONIST_GREETING_CANDIDATES`), preventing static repetitive text when starting sessions or selecting icebreaker emojis.
  - **Prohibited Word Sanitizer & Hold-Back Buffer**: Dedicated sanitizer (`worker/src/lib/sanitizer.ts`) and hold-back buffer (`getEmittableAndBuffer`) enforcing zero occurrence of vulgar slang (e.g., `"卧槽"`) across isolated tokens and split-chunk SSE streaming boundaries while preserving valid Chinese vocabulary (`"依靠"`, `"可靠"`, `"操作"`, `"操心"`, `"操场"`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | FSM State Extension & Context Schema | Extend `FSMState` with `Pre_Info_Collection` and `FSMContext` with `preInfo: PreInfoData` in `worker/` and `web/` | M1 | Survey |
| 2 | Receptionist AI Persona & Prompt Orchestration | Implement `PROMPT_PRE_INFO_COLLECTION` and `OUTPUT_FORMAT_PRE_INFO` in LLM engine; handle initial greeting and name extraction | M1 | Survey |
| 3 | FSM Transition Engine & D1 Context Persistence | Add `transitionFromPreInfo` state transition, extract `user_name`, update D1 `fsm_context`, smoothly transition to `Active_Listening` | M1 | Survey |
| 4 | Counseling System Prompt User Name Injection | Inject `userName` into formal counseling system prompts in `buildSystemPromptFSM()` so formal counseling AI addresses user by name | M1 | Survey |
| 5 | Frontend Chat State & UI Receptionist Flow Integration | Update `useChatStore`, `useChat`, `GeminiWelcome`, `ChatPanel`, and `MessageBubble` to handle initial Receptionist greeting, store `userInfo`, and render smooth transition | M2 | Survey |
| 6 | Cross-Session Memory Persistence (R3) | Decoupled `MemoryService` in `worker/src/lib/memory.ts` saving `userName` under `user_memories` D1 table, allowing new sessions to inherit user memory | M3 | R3 Requirement |
| 7 | Memory Deletion Synchronization (R3) | Hook into session deletion endpoint (`DELETE /sessions/:id`) to clean-clear associated user memories | M3 | R3 Requirement |
| 8 | Receptionist Greeting Diversity & Prohibited Word Sanitizer (R4) | Multi-candidate diverse receptionist greetings + Hold-Back Buffer sanitizer enforcing professional tone without vulgar words ("卧槽") | M4 | R4 Requirement |
| 9 | Multi-layered Automated Testing & E2E Validation Script | `scripts/pre-info-verify.mjs` verifying R1..R4 end-to-end, Vitest backend/frontend unit suites, and Vite production build | M5 | Survey / R3 / R4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Backend Pre-Info FSM Engine & Prompt Orchestration | `worker/src/types.ts`, `worker/src/lib/fsm.ts`, `worker/src/lib/llm.ts`, `worker/src/routes/chat.ts` | None | DONE |
| 2 | Frontend Receptionist State & Smooth UI Transition | `web/src/types/index.ts`, `web/src/store/chatStore.ts`, `web/src/hooks/useChat.ts`, `web/src/components/chat/` | M1 | DONE |
| 3 | Decoupled Cross-Session Memory & Deletion Sync (R3) | `worker/src/lib/memory.ts`, `worker/migrations/0007_user_memories.sql`, `worker/src/routes/auth.ts`, `worker/src/routes/chat.ts` | M1 | DONE |
| 4 | Receptionist Greeting Diversity & Prohibited Word Sanitizer (R4) | `worker/src/lib/fsm.ts`, `worker/src/lib/sanitizer.ts`, `worker/src/routes/chat.ts`, `worker/src/test/` | M1, M2 | DONE |
| 5 | Verification Suite & Automated Testing Scripts | Worker & Web unit tests, API smoke verification script `scripts/pre-info-verify.mjs` | M1..M4 | DONE |

## Interface Contracts
### `worker` ↔ `web` (SSE & API Contract)
- **FSM State String**: `'Pre_Info_Collection' | 'Active_Listening' | 'CBT_Stripping' | 'Socratic_Questioning' | 'Crisis_Escalation'`
- **PreInfo Payload Structure**:
  ```typescript
  export interface PreInfoData {
    userName?: string;
    collectionCompleted: boolean;
    collectedAt?: number;
    fromMemory?: boolean; // True if loaded from cross-session memory
  }
  ```
- **Memory Table Schema (`user_memories`)**:
  ```sql
  CREATE TABLE IF NOT EXISTS user_memories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    memory_key TEXT NOT NULL,
    memory_value TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  ```

## Code Layout
- `worker/src/types.ts`: FSM state enums & data interfaces
- `worker/src/lib/fsm.ts`: State machine transitions, receptionist prompt constants & greeting candidate pool (R4)
- `worker/src/lib/llm.ts`: Dynamic system prompt builder, JSON output schemas & user name prompt injection
- `worker/src/lib/memory.ts`: Decoupled cross-session memory service (R3)
- `worker/src/lib/sanitizer.ts`: Dedicated prohibited word sanitizer & Hold-Back Buffer algorithm `getEmittableAndBuffer` (R4)
- `worker/src/routes/chat.ts`: Chat API route handler, SSE stream with Hold-Back Buffer, D1 persistence & memory loading
- `worker/src/routes/auth.ts`: Auth & session CRUD handlers (`DELETE /sessions/:id` memory cleanup)
- `web/src/types/index.ts`: Frontend TypeScript interfaces
- `web/src/store/chatStore.ts`: Zustand store for chat state & user profile
- `web/src/hooks/useChat.ts`: Streaming SSE hook & session initialization
- `web/src/components/chat/`: UI view components (`ChatPanel`, `GeminiWelcome`, `MessageBubble`)
- `scripts/pre-info-verify.mjs`: Automated verification script covering R1..R4
