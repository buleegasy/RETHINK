# Project: CBT Behavioral Activation RAG Integration & Testing

## Architecture
We are adding a professional, clinically reliable Cognitive Behavioral Therapy (CBT) and Behavioral Activation (BA) guide targeting four adolescent pressure domains (Academic, Relationship, Self-Esteem, Depression).
1. **Knowledge Base (Markdown)**: Contains 4 modules (Academic Stress, Self-Esteem Issues, Relationship Conflict, Midnight Emo / Depression). Must include clinical reference, 0-barrier actions, time cost, step-by-step procedures, and autonomic nervous system regulation mechanism.
2. **Ingestion Flow**: Call `POST http://localhost:8787/api/knowledge/ingest` with title and content.
3. **Retrieval Verification**: Write a TypeScript test file `test-behavior-activation-rag.ts` that will be run via `npx tsx`. It queries Vectorize with 5 typical adolescent request scenarios and asserts:
   - Precision matching: Returned chunk matches correct category/domain (e.g. academic query returns academic habit).
   - Similarity score: Requisite score >= 0.55.
   - Run without error using `npx tsx`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Professional CBT Guide | Write/Refine cbt_behavioral_activation.md with required clinical references and mechanics | None | DONE |
| 2 | KB Ingestion | Ingest guide into Vectorize using backend API | M1 | DONE |
| 3 | Automated Quality Retrieval Testing | Implement and run test-behavior-activation-rag.ts to assert match accuracy and similarity >= 0.55 | M2 | DONE |

## Interface Contracts
### Ingestion API
`POST http://localhost:8787/api/knowledge/ingest`
- Request: `{ title: string, content: string, sourceFile?: string }`
- Response: `{ success: boolean, documentId: string, chunkCount: number, message: string }`

### Test Runner
- Run: `npx tsx test-behavior-activation-rag.ts`
- Target URL: `http://localhost:8787/api/knowledge/query` (added new Hono route for direct RAG semantic retrieval verification).
