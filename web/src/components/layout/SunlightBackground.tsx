import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  alpha: number;
  baseAlpha: number;
  swirl: number;
}

interface Ray {
  x: number;
  angle: number;
  width: number;
  alpha: number;
  speed: number;
  offset: number;
}

export function SunlightBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const particles: Particle[] = [];
    const rays: Ray[] = [];
    const particleCount = Math.floor((width * height) / 10000); // Responsive particle count
    const rayCount = 8;

    let mouseX = -1000;
    let mouseY = -1000;
    let targetMouseX = -1000;
    let targetMouseY = -1000;

    // Initialize Particles (Dust motes)
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.3 + 0.2, // Drifting right
        vy: (Math.random() - 0.5) * 0.3 - 0.2, // Drifting up
        alpha: 0,
        baseAlpha: Math.random() * 0.6 + 0.1,
        swirl: Math.random() * Math.PI * 2,
      });
    }

    // Initialize God Rays
    for (let i = 0; i < rayCount; i++) {
      rays.push({
        x: (Math.random() * width * 1.5) - width * 0.25,
        angle: Math.PI / 4 + (Math.random() * 0.2 - 0.1), // ~45 degrees diagonal
        width: Math.random() * 200 + 100,
        alpha: Math.random() * 0.15 + 0.05,
        speed: (Math.random() * 0.005 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
        offset: Math.random() * Math.PI * 2,
      });
    }

    let animationFrameId: number;
    let time = 0;

    const drawBackground = () => {
      // Warm, organic liquid gradient background
      const grad = ctx.createRadialGradient(
        width * 0.3, height * 0.2, 0,
        width * 0.5, height * 0.5, width
      );
      grad.addColorStop(0, '#FFFDF5'); // Pure warm light
      grad.addColorStop(0.4, '#FDF2D6'); // Warm sunlight yellow
      grad.addColorStop(1, '#F3E5CB'); // Soft earthy beige

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw a subtle animated warm "flow" blob at the bottom
      const blobGrad = ctx.createRadialGradient(
        width * 0.8 + Math.sin(time * 0.5) * 100, 
        height * 0.9 + Math.cos(time * 0.3) * 50, 
        0,
        width * 0.8, height * 0.9, width * 0.6
      );
      blobGrad.addColorStop(0, 'rgba(255, 219, 166, 0.4)'); // Peach/amber glow
      blobGrad.addColorStop(1, 'rgba(255, 219, 166, 0)');
      
      ctx.fillStyle = blobGrad;
      ctx.fillRect(0, 0, width, height);
    };

    const drawRays = () => {
      rays.forEach(ray => {
        ray.offset += ray.speed;
        const currentAlpha = ray.alpha + Math.sin(ray.offset) * 0.05;
        
        ctx.save();
        ctx.beginPath();
        // Start from top edge, extend diagonally downwards
        ctx.moveTo(ray.x, -100);
        ctx.lineTo(ray.x + ray.width, -100);
        
        // Calculate bottom points based on angle
        const bottomX1 = ray.x + (height + 200) * Math.tan(ray.angle);
        const bottomX2 = ray.x + ray.width + (height + 200) * Math.tan(ray.angle);
        
        ctx.lineTo(bottomX2, height + 100);
        ctx.lineTo(bottomX1, height + 100);
        ctx.closePath();

        const rayGrad = ctx.createLinearGradient(ray.x, -100, bottomX1, height + 100);
        rayGrad.addColorStop(0, `rgba(255, 255, 255, ${Math.max(0, currentAlpha)})`);
        rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = rayGrad;
        ctx.fill();
        ctx.restore();
      });
    };

    const updateAndDrawParticles = () => {
      // Smooth mouse interpolation
      mouseX += (targetMouseX - mouseX) * 0.1;
      mouseY += (targetMouseY - mouseY) * 0.1;

      particles.forEach(p => {
        // Swirling motion
        p.swirl += 0.02;
        const swirlX = Math.cos(p.swirl) * 0.2;
        const swirlY = Math.sin(p.swirl) * 0.2;

        p.x += p.vx + swirlX;
        p.y += p.vy + swirlY;

        // Mouse interaction (fluid push)
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const interactionRadius = 250;

        if (dist < interactionRadius) {
          const force = (interactionRadius - dist) / interactionRadius;
          const pushX = (dx / dist) * force * 2;
          const pushY = (dy / dist) * force * 2;
          
          p.x -= pushX;
          p.y -= pushY;
          
          // Particles light up when near the mouse "sunlight"
          p.alpha = Math.min(p.baseAlpha + force * 0.8, 1);
        } else {
          // Fade back to normal
          p.alpha += (p.baseAlpha - p.alpha) * 0.05;
        }

        // Wrap around screen
        if (p.y < -50) p.y = height + 50;
        if (p.x > width + 50) p.x = -50;
        if (p.x < -50) p.x = width + 50;
        if (p.y > height + 50) p.y = -50;

        // Draw particle (Golden / Warm White)
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 240, 200, ${p.alpha})`;
        
        // Add a slight glow to larger particles
        if (p.radius > 1.5) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'rgba(255, 210, 100, 0.5)';
        } else {
          ctx.shadowBlur = 0;
        }
        
        ctx.fill();
      });
      ctx.shadowBlur = 0; // Reset
    };

    const animate = () => {
      time += 0.01;
      drawBackground();
      drawRays();
      updateAndDrawParticles();
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    const handleMouseLeave = () => {
      targetMouseX = -1000;
      targetMouseY = -1000;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
