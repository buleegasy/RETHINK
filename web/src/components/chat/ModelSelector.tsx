import React, { useState } from 'react';
import type { FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Cpu } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

interface ModelOption {
  id: string;
  name: string;
  badge: string;
}

const AVAILABLE_MODELS: ModelOption[] = [
  { id: 'claude-haiku-4.5', name: 'Claude 4.5 Haiku', badge: 'Fast & Empathetic' },
  { id: 'deepseek-r1', name: 'DeepSeek R1', badge: 'Reasoning' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', badge: 'Balanced' },
  { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', badge: 'Open Weights' },
];

export const ModelSelector: FC = () => {
  const selectedModel = useChatStore((state) => state.selectedModel);
  const setSelectedModel = useChatStore((state) => state.setSelectedModel);
  const [isOpen, setIsOpen] = useState(false);

  const current = AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  return (
    <div className="relative inline-block text-left select-none z-30">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container/60 hover:bg-surface-container-high/80 border border-outline-variant/30 backdrop-blur-md text-xs font-medium text-on-surface transition-all duration-200 cursor-pointer shadow-sm"
        aria-label="选择模型"
      >
        <Cpu className="w-3.5 h-3.5 text-gemini-blue" />
        <span>{current.name}</span>
        <ChevronDown className={`w-3 h-3 text-on-surface-variant transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 mt-2 w-52 rounded-2xl bg-surface-container-highest/95 backdrop-blur-xl border border-outline-variant/40 shadow-xl z-40 p-1.5 space-y-1"
            >
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant/60">
                选择 AI 驱动模型
              </div>
              {AVAILABLE_MODELS.map((model) => {
                const isSelected = model.id === selectedModel;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => {
                      setSelectedModel(model.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-gemini-blue/15 text-gemini-blue font-semibold'
                        : 'text-on-surface hover:bg-surface-container-high/70'
                    }`}
                  >
                    <span>{model.name}</span>
                    <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-surface-container-high/60 text-on-surface-variant font-mono">
                      {model.badge}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
