import type { CSSProperties } from 'react';

export const ReThinkLogo = ({ 
  className = '', 
  style, 
  isThinking = false 
}: { 
  className?: string, 
  style?: CSSProperties,
  isThinking?: boolean 
}) => {
  return (
    <div className={`relative flex items-center justify-center text-gray-900 dark:text-gray-100 ${className} ${isThinking ? 'thinking' : 'idle'}`} style={style}>
      
      {/* Universal Gooey SVG Filter for true liquid physics. 
          Extended bounds (x, y, width, height) prevent cropping when droplets spin outward. */}
      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          <filter id="rethink-goo" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
          </filter>
        </defs>
      </svg>

      <style>
        {`
          .liquid-container {
            width: 100%;
            height: 100%;
            filter: url('#rethink-goo');
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          /* Rotation speeds for the wrappers */
          .spin-1 { animation: spin 10s linear infinite; }
          .spin-2 { animation: spin 14s linear infinite reverse; }
          .spin-3 { animation: spin 12s linear infinite; }
          
          /* Intense speeds for thinking state */
          .thinking .spin-1 { animation: spin 1.5s linear infinite; }
          .thinking .spin-2 { animation: spin 2.0s linear infinite reverse; }
          .thinking .spin-3 { animation: spin 1.8s linear infinite; }
          
          @keyframes spin { 100% { transform: rotate(360deg); } }
          
          /* The liquid droplets */
          .liquid-drop {
            position: absolute;
            background: currentColor;
            border-radius: 50%; /* Pure circles merge perfectly via the goo filter */
            /* Smooth transitions for pulling apart and resizing */
            transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), 
                        width 0.8s ease, height 0.8s ease;
          }
          
          /* Idle State: Blobs are clumped together, gently orbiting */
          .blob-1 { width: 55%; height: 55%; transform: translateX(8%); }
          .blob-2 { width: 45%; height: 45%; transform: translateX(-12%); }
          .blob-3 { width: 35%; height: 35%; transform: translateY(15%); }
          
          /* Thinking State: Blobs shrink slightly but tear far apart, stretching the liquid bridges */
          .thinking .blob-1 { width: 40%; height: 40%; transform: translateX(35%); }
          .thinking .blob-2 { width: 30%; height: 30%; transform: translateX(-40%); }
          .thinking .blob-3 { width: 25%; height: 25%; transform: translateY(45%); }
        `}
      </style>
      
      <div className="liquid-container relative w-full h-full">
        {/* Layer 1 */}
        <div className="absolute inset-0 flex items-center justify-center spin-1">
          <div className="liquid-drop blob-1" />
        </div>
        {/* Layer 2 */}
        <div className="absolute inset-0 flex items-center justify-center spin-2">
          <div className="liquid-drop blob-2" />
        </div>
        {/* Layer 3 */}
        <div className="absolute inset-0 flex items-center justify-center spin-3">
          <div className="liquid-drop blob-3" />
        </div>
      </div>
    </div>
  );
};
