import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { SandplayState, TerrainTheme } from '../../types/sandplay';

export const TERRAIN_STYLES: Record<TerrainTheme, string> = {
  desert: 'bg-gradient-to-br from-[#E6D4B8] to-[#D4B886]',
  starry_sky: 'bg-gradient-to-br from-[#0F2027] via-[#203A43] to-[#2C5364]',
  stormy_sea: 'bg-gradient-to-br from-[#373B44] to-[#4286f4]',
  forest: 'bg-gradient-to-br from-[#134E5E] to-[#71B280]',
};

export const TERRAIN_NAMES: Record<TerrainTheme, string> = {
  desert: '荒漠',
  starry_sky: '星空',
  stormy_sea: '暴风雨',
  forest: '森林',
};

interface SandplayCanvasProps {
  state: SandplayState;
  onChange: (newState: SandplayState) => void;
  readOnly?: boolean;
}

export const SandplayCanvas: React.FC<SandplayCanvasProps> = ({ state, onChange, readOnly = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleDragEnd = (id: string, info: any) => {
    if (readOnly || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (info.point.x - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (info.point.y - rect.top) / rect.height));

    const updated = state.miniatures.map(m => m.id === id ? { ...m, position: { x, y } } : m);
    onChange({ ...state, miniatures: updated });
  };

  const handleLabelChange = (id: string, newLabel: string) => {
    const updated = state.miniatures.map(m => m.id === id ? { ...m, label: newLabel } : m);
    onChange({ ...state, miniatures: updated });
  };

  const removeMiniature = (id: string) => {
    onChange({ ...state, miniatures: state.miniatures.filter(m => m.id !== id) });
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        {(Object.keys(TERRAIN_STYLES) as TerrainTheme[]).map(theme => (
          <button
            key={theme}
            onClick={() => !readOnly && onChange({ ...state, terrain: theme })}
            className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md transition-all ${
              state.terrain === theme 
                ? 'bg-white/30 text-white border border-white/50' 
                : 'bg-black/20 text-white/70 hover:bg-white/20'
            }`}
            disabled={readOnly}
          >
            {TERRAIN_NAMES[theme]}
          </button>
        ))}
      </div>

      <div 
        ref={containerRef}
        className={`flex-1 w-full rounded-2xl overflow-hidden relative transition-colors duration-1000 ${TERRAIN_STYLES[state.terrain]}`}
        style={{
          boxShadow: 'inset 0 0 40px rgba(0,0,0,0.3)'
        }}
      >
        {state.miniatures.map((item) => (
          <motion.div
            key={item.id}
            className="absolute flex flex-col items-center justify-center cursor-grab active:cursor-grabbing group"
            style={{
              left: `${item.position.x * 100}%`,
              top: `${item.position.y * 100}%`,
              x: '-50%',
              y: '-50%',
              scale: item.scale,
              rotate: item.rotation,
              zIndex: editingId === item.id ? 50 : 10
            }}
            drag={!readOnly}
            dragConstraints={containerRef}
            dragElastic={0}
            dragMomentum={false}
            onDragEnd={(e, info) => handleDragEnd(item.id, info)}
            onDoubleClick={() => !readOnly && setEditingId(item.id)}
          >
            {/* Delete button (shows on hover) */}
            {!readOnly && (
              <button 
                onClick={(e) => { e.stopPropagation(); removeMiniature(item.id); }}
                className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-md flex items-center justify-center text-xs"
              >
                ✕
              </button>
            )}

            {/* Asset SVG */}
            <div className="w-16 h-16 pointer-events-none drop-shadow-xl">
              <img src={item.assetKey} alt={item.label} className="w-full h-full object-contain" />
            </div>

            {/* Label editing */}
            {editingId === item.id ? (
              <input
                autoFocus
                type="text"
                className="mt-1 px-2 py-0.5 text-xs bg-white/90 text-black rounded outline-none border border-blue-400 text-center w-24 shadow-sm"
                value={item.label}
                onChange={(e) => handleLabelChange(item.id, e.target.value)}
                onBlur={() => setEditingId(null)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
              />
            ) : (
              <div className="mt-1 px-2 py-0.5 text-xs bg-black/40 text-white rounded backdrop-blur-sm pointer-events-none select-none max-w-[100px] truncate text-center shadow-sm">
                {item.label}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
