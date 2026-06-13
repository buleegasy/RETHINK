import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function LiquidBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#FAF9F6] z-0 pointer-events-none">
      {/* 
        This uses layered large blur circles and CSS animations to create a 
        warm, organic, liquid-like gradient feel. 
        Colors: 
        - Off-white base: #FAF9F6
        - Soft oat/beige: #EBE5D9
        - Cream yellow: #FFFDD0
        - Warm blush: #FDE8E9
      */}

      {/* Main ambient gradient blob 1 */}
      <motion.div
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -50, 100, 0],
          scale: [1, 1.1, 0.9, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-gradient-to-br from-[#EBE5D9]/80 to-[#FFFDD0]/60 rounded-full blur-[120px] mix-blend-multiply opacity-80"
      />

      {/* Main ambient gradient blob 2 */}
      <motion.div
        animate={{
          x: [0, -100, 50, 0],
          y: [0, 100, -50, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute -bottom-[20%] -right-[10%] w-[80vw] h-[80vw] bg-gradient-to-tl from-[#FDE8E9]/80 to-[#EBE5D9]/60 rounded-full blur-[140px] mix-blend-multiply opacity-70"
      />

      {/* Subtle mouse follow blob */}
      <motion.div
        animate={{
          x: mousePosition.x - 300,
          y: mousePosition.y - 300,
        }}
        transition={{
          type: "spring",
          stiffness: 40,
          damping: 30,
          mass: 0.5,
        }}
        className="absolute w-[600px] h-[600px] bg-[#FFFDD0]/40 rounded-full blur-[100px] mix-blend-overlay opacity-60 hidden md:block"
      />

      {/* Grain texture overlay for a premium matte paper feel */}
      <div 
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
