import { describe, it, expect } from 'vitest';
import { transition, createDefaultContext, applyTransition, getPromptForState, RECEPTIONIST_GREETING_CANDIDATES, type FSMState } from '../lib/fsm';
import { containsProhibitedWords } from '../lib/sanitizer';
import type { IntentResult } from '../lib/intent-router';
import { applyPreInfoUpdate } from '../routes/chat';
import { buildSystemPromptFSM } from '../lib/llm';

describe('FSM', () => {
  describe('createDefaultContext', () => {
    it('should initialize context with Pre_Info_Collection state', () => {
      const ctx = createDefaultContext();
      expect(ctx.currentState).toBe('Pre_Info_Collection');
      expect(ctx.preInfo).toBeDefined();
      expect(ctx.preInfo.collectionCompleted).toBe(false);
      expect(ctx.preInfo.userName).toBeUndefined();
    });
  });

  describe('transition', () => {
    it('should stay in Pre_Info_Collection when preInfo is incomplete and intent is casual', () => {
      const ctx = createDefaultContext();
      const intent: IntentResult = { type: 'casual', emotion: 'Neutral', confidence: 0.9, triggers: [] };
      const res = transition(ctx, intent, 'pre');
      expect(res.nextState).toBe('Pre_Info_Collection');
    });

    it('should transition from Pre_Info_Collection to Active_Listening when userName is provided', () => {
      const ctx = createDefaultContext();
      ctx.preInfo.userName = '小明';
      const intent: IntentResult = { type: 'casual', emotion: 'Neutral', confidence: 0.9, triggers: [] };
      const res = transition(ctx, intent, 'pre');
      expect(res.nextState).toBe('Active_Listening');
      expect(res.contextUpdate.preInfo?.collectionCompleted).toBe(true);
    });

    it('should transition from Pre_Info_Collection to Active_Listening when collectionCompleted is true', () => {
      const ctx = createDefaultContext();
      ctx.preInfo.collectionCompleted = true;
      const intent: IntentResult = { type: 'casual', emotion: 'Neutral', confidence: 0.9, triggers: [] };
      const res = transition(ctx, intent, 'pre');
      expect(res.nextState).toBe('Active_Listening');
    });

    it('should transition from Pre_Info_Collection to Active_Listening on strong emotional intent', () => {
      const ctx = createDefaultContext();
      const intent: IntentResult = { type: 'emotional', emotion: 'Anxiety', confidence: 0.6, triggers: ['难受'] };
      const res = transition(ctx, intent, 'pre');
      expect(res.nextState).toBe('Active_Listening');
      expect(res.contextUpdate.preInfo?.collectionCompleted).toBe(true);
    });

    it('should handle crisis intent globally', () => {
      const ctx = createDefaultContext();
      const intent: IntentResult = { type: 'crisis', emotion: 'Anxiety', confidence: 1.0, triggers: ['想死'] };
      const res = transition(ctx, intent);
      expect(res.nextState).toBe('Crisis_Escalation');
      expect(res.contextUpdate.emotionalStreak).toBe(0);
    });

    it('should not exit Crisis_Escalation', () => {
      const ctx = createDefaultContext();
      ctx.currentState = 'Crisis_Escalation';
      const intent: IntentResult = { type: 'casual', emotion: 'Neutral', confidence: 1.0, triggers: [] };
      const res = transition(ctx, intent);
      expect(res.nextState).toBe('Crisis_Escalation');
    });

    it('should progress from Onboarding to Active_Listening on exitSignal', () => {
      const ctx = createDefaultContext();
      ctx.currentState = 'Onboarding';
      ctx.icebreaker.exitSignal = true;
      const intent: IntentResult = { type: 'casual', emotion: 'Neutral', confidence: 1.0, triggers: [] };
      const res = transition(ctx, intent, 'post');
      expect(res.nextState).toBe('Active_Listening');
    });

    it('should handle Onboarding progression with high emotional intent', () => {
      const ctx = createDefaultContext();
      ctx.currentState = 'Onboarding';
      const intent: IntentResult = { type: 'emotional', emotion: 'Anxiety', confidence: 0.5, triggers: ['难受'] };
      const res = transition(ctx, intent, 'pre');
      expect(res.nextState).toBe('Active_Listening');
    });

    it('should handle Active_Listening to CBT_Stripping', () => {
      const ctx = createDefaultContext();
      ctx.currentState = 'Active_Listening';
      ctx.emotionalStreak = 3;
      const intent: IntentResult = { type: 'emotional', emotion: 'LowMood', confidence: 0.6, triggers: [] };
      const res = transition(ctx, intent, 'pre');
      expect(res.nextState).toBe('CBT_Stripping');
    });

    it('should handle CBT_Stripping to Active_Listening fallback', () => {
      const ctx = createDefaultContext();
      ctx.currentState = 'CBT_Stripping';
      const intent: IntentResult = { type: 'emotional', emotion: 'Anxiety', confidence: 0.9, triggers: [] };
      const res = transition(ctx, intent, 'pre');
      expect(res.nextState).toBe('Active_Listening');
    });

    it('should detect ABC completion and move to Socratic_Questioning', () => {
      const ctx = createDefaultContext();
      ctx.currentState = 'CBT_Stripping';
      const intent: IntentResult = { type: 'ambiguous', emotion: 'Neutral', confidence: 0.5, triggers: [] };
      const aiOutput = '客观事实是你没考好，你的想法是自己没用，这让你感到很难受。';
      const res = transition(ctx, intent, 'post', aiOutput);
      expect(res.nextState).toBe('Socratic_Questioning');
      expect(res.contextUpdate.abcCompleted).toBe(true);
    });

    it('should handle Socratic_Questioning back to Active_Listening on casual', () => {
      const ctx = createDefaultContext();
      ctx.currentState = 'Socratic_Questioning';
      const intent: IntentResult = { type: 'casual', emotion: 'Neutral', confidence: 0.9, triggers: [] };
      const res = transition(ctx, intent, 'pre');
      expect(res.nextState).toBe('Active_Listening');
    });
  });

  describe('applyPreInfoUpdate', () => {
    it('should extract valid user_name and set collectionCompleted', () => {
      const current = { collectionCompleted: false };
      const update = { user_name: ' 小明 ', collection_completed: false };
      const res = applyPreInfoUpdate(current, update);
      expect(res.userName).toBe('小明');
      expect(res.collectionCompleted).toBe(true);
      expect(res.collectedAt).toBeGreaterThan(0);
    });

    it('should handle special Unicode and emoji in user_name', () => {
      const current = { collectionCompleted: false };
      const update = { user_name: ' 🌟小明·Alex😊 ' };
      const res = applyPreInfoUpdate(current, update);
      expect(res.userName).toBe('🌟小明·Alex😊');
      expect(res.collectionCompleted).toBe(true);
    });

    it('should handle empty or whitespace-only user_name', () => {
      const current = { collectionCompleted: false };
      const update = { user_name: '   ', collection_completed: false };
      const res = applyPreInfoUpdate(current, update);
      expect(res.userName).toBeUndefined();
      expect(res.collectionCompleted).toBe(false);
    });

    it('should handle user refusal or explicit completion without name', () => {
      const current = { collectionCompleted: false };
      const update = { user_name: null, collection_completed: true };
      const res = applyPreInfoUpdate(current, update);
      expect(res.userName).toBeUndefined();
      expect(res.collectionCompleted).toBe(true);
      expect(res.collectedAt).toBeGreaterThan(0);
    });

    it('should ignore non-string user_name types gracefully', () => {
      const current = { collectionCompleted: false };
      const update = { user_name: 12345, collection_completed: false };
      const res = applyPreInfoUpdate(current, update);
      expect(res.userName).toBeUndefined();
      expect(res.collectionCompleted).toBe(false);
    });
  });

  describe('buildSystemPromptFSM Injection', () => {
    it('should include receptionist prompt and pre-info JSON schema in Pre_Info_Collection state', () => {
      const prompt = buildSystemPromptFSM('Pre_Info_Collection', 'casual');
      expect(prompt).toContain('前台接待员');
      expect(prompt).toContain('pre_info_update');
      expect(prompt).not.toContain('【用户信息】：用户称呼为');
    });

    it('should inject user_name into system prompt when transitioned to Active_Listening', () => {
      const preInfo = { userName: '小明', collectionCompleted: true };
      const prompt = buildSystemPromptFSM('Active_Listening', 'emotional', undefined, undefined, undefined, undefined, preInfo);
      expect(prompt).toContain('【用户信息】：用户称呼为「小明」。在后续对话中自然使用此称呼。');
    });

    it('should omit user_name prompt section if userName is absent in Active_Listening', () => {
      const preInfo = { collectionCompleted: true };
      const prompt = buildSystemPromptFSM('Active_Listening', 'emotional', undefined, undefined, undefined, undefined, preInfo);
      expect(prompt).not.toContain('【用户信息】：用户称呼为');
    });

    it('should ensure system prompts across all states contain zero prohibited words', () => {
      const states: FSMState[] = [
        'Pre_Info_Collection',
        'Onboarding',
        'Active_Listening',
        'CBT_Stripping',
        'Socratic_Questioning',
        'Crisis_Escalation',
      ];
      for (const state of states) {
        const prompt = buildSystemPromptFSM(state, 'casual');
        expect(containsProhibitedWords(prompt)).toBe(false);
      }
    });

    it('should export diverse receptionist greetings', () => {
      expect(RECEPTIONIST_GREETING_CANDIDATES.length).toBeGreaterThanOrEqual(5);
      for (const greeting of RECEPTIONIST_GREETING_CANDIDATES) {
        expect(containsProhibitedWords(greeting)).toBe(false);
      }
    });
  });

  describe('applyTransition', () => {
    it('should correctly apply transition results to context', () => {
      const ctx = createDefaultContext();
      const intent: IntentResult = { type: 'crisis', emotion: 'Anxiety', confidence: 1.0, triggers: [] };
      const res = transition(ctx, intent);
      const newCtx = applyTransition(ctx, res);
      expect(newCtx.currentState).toBe('Crisis_Escalation');
      expect(newCtx.emotionalStreak).toBe(0);
      expect(newCtx).not.toBe(ctx); // should be immutable update
    });
  });
});


