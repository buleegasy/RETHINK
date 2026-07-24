import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MINIATURE_ASSETS, type MiniatureCategory, type SandplayState } from '../../types/sandplay';
const uuidv4 = () => crypto.randomUUID();

interface MiniaturePickerProps {
  state: SandplayState;
  onChange: (newState: SandplayState) => void;
  disabled?: boolean;
}

const CATEGORY_NAMES: Record<MiniatureCategory, string> = {
  self: '自我与人物',
  emotion: '自然与情绪',
  obstacle: '阻碍与压力',
  resource: '资源与希望',
};

export const MiniaturePicker: React.FC<MiniaturePickerProps> = ({ state, onChange, disabled = false }) => {
  const [activeTab, setActiveTab] = useState<MiniatureCategory>('self');

  const addMiniature = (assetKey: string, defaultLabel: string, category: MiniatureCategory) => {
    if (disabled) return;
    
    // Add to center of the canvas with a slight random offset to prevent exact stacking
    const randomOffset = () => (Math.random() - 0.5) * 0.1;
    
    const newItem = {
      id: uuidv4(),
      assetKey,
      category,
      label: defaultLabel,
      position: { x: 0.5 + randomOffset(), y: 0.5 + randomOffset() },
      scale: 1,
      rotation: 0,
    };
    
    onChange({
      ...state,
      miniatures: [...state.miniatures, newItem]
    });
  };

  const assetsInTab = MINIATURE_ASSETS.filter(a => a.category === activeTab);

  return (
    <div className="flex flex-col bg-surface-container-low rounded-t-3xl border-t border-outline-variant/30 overflow-hidden shrink-0 h-48">
      {/* Tabs */}
      <div className="flex gap-4 px-6 pt-4 pb-2 overflow-x-auto scrollbar-hide border-b border-outline-variant/20">
        {(Object.keys(CATEGORY_NAMES) as MiniatureCategory[]).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`whitespace-nowrap pb-2 text-sm font-medium transition-colors relative ${
              activeTab === cat ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {CATEGORY_NAMES[cat]}
            {activeTab === cat && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Asset Grid */}
      <div className="flex-1 overflow-y-auto p-4 flex gap-4 overflow-x-auto scrollbar-hide items-center">
        {assetsInTab.map(asset => (
          <motion.div
            key={asset.key}
            whileHover={disabled ? {} : { scale: 1.05, y: -4 }}
            whileTap={disabled ? {} : { scale: 0.95 }}
            onClick={() => addMiniature(asset.svgPath, asset.defaultLabel, asset.category)}
            className={`flex flex-col items-center gap-2 p-3 rounded-2xl min-w-[80px] cursor-pointer transition-colors ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-container-high'
            }`}
          >
            <div className="w-12 h-12 flex items-center justify-center drop-shadow-md">
              <img src={asset.svgPath} alt={asset.name} className="w-full h-full object-contain pointer-events-none" />
            </div>
            <span className="text-xs text-on-surface-variant select-none">{asset.name}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
