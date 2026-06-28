# Project: Fix Chat Deletion Feature

## Architecture
This project refactors the chat deletion feature to completely remove conversation files and associated media assets, synchronizing frontend state and providing automated deletion verification.
- **Backend API**: Deletion route (`/api/chat/:id` or similar) in the worker/backend.
- **File System**: Session storage and media asset storage paths.
- **Frontend Components**:
  - `SessionSidebar.tsx`: Lists chat sessions.
  - `ChatPanel.tsx` / `useChat.ts` / state stores: Controls the active session and triggers the deletion API.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Research & Discovery | Audit file system paths, media association, backend deletion API, and frontend chat list component | None | DONE |
| 2 | Deletion & Media Cleanup Implementation | Modify backend to delete entire session files and associated media, and update frontend to sync list and route active chat | M1 | DONE |
| 3 | Review & Challenger Testing | Perform code review and execute a programmatic test verifying no files or media remain | M2 | DONE |
| 4 | Forensic Audit | Verify integrity of the solution using the Forensic Auditor | M3 | DONE |
| 5 | Eslint Linting Fix | Resolve eslint error in test files and verify build/lint passes | M4 | DONE |

## Interface Contracts
### Client ↔ Server Chat Deletion
- **Endpoint**: DELETE `/api/chat/:id` or `/api/session/:id` (exact endpoint to be confirmed by Explorer)
- **Response**: Success status with a confirmation message, or appropriate error code (e.g. 404 if not found).
- **Behavior**: Server must recursively delete the target session JSON/Markdown file and any associated media files on disk before returning success.
