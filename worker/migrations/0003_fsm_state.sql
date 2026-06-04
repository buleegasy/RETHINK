-- FSM 状态机字段扩展
-- 执行：wrangler d1 execute re-think-sessions --file=./migrations/0003_fsm_state.sql

ALTER TABLE sessions ADD COLUMN fsm_state TEXT NOT NULL DEFAULT 'Onboarding';
ALTER TABLE sessions ADD COLUMN fsm_context TEXT NOT NULL DEFAULT '{}';
