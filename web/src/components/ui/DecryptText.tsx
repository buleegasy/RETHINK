import { useEffect, useState, useRef } from 'react';

interface DecryptTextProps {
  text: string; // The final text to display
  speed?: number; // Speed of character cycling in milliseconds
  delay?: number; // Delay before animation start in milliseconds
  scrambleSteps?: number; // Number of scramble steps per character before resolving
  className?: string; // CSS class for container
  animateOnMount?: boolean; // Whether to run scramble on mount
  useMonospace?: boolean; // If true, assumes monospace font. If false, uses absolute overlay with hidden text to prevent layout shifts.
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}|:"<>?-=[]\\;\',./';

export function DecryptText({
  text,
  speed = 30,
  delay = 0,
  scrambleSteps = 3,
  className = '',
  animateOnMount = true,
  useMonospace = false,
}: DecryptTextProps) {
  const [displayText, setDisplayText] = useState('');
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    if (!animateOnMount) {
      setDisplayText(text);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;
    let intervalId: ReturnType<typeof setInterval>;

    const startAnimation = () => {
      isAnimatingRef.current = true;
      const length = text.length;
      let frame = 0;
      const totalFrames = length * scrambleSteps;

      intervalId = setInterval(() => {
        let currentText = '';

        for (let i = 0; i < length; i++) {
          const resolvedIndex = Math.floor(frame / scrambleSteps);

          if (i < resolvedIndex) {
            currentText += text[i];
          } else if (i === resolvedIndex) {
            // Animating character: scramble it
            currentText += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          } else {
            // Remaining characters: random glyphs or spaces
            if (text[i] === ' ') {
              currentText += ' ';
            } else {
              currentText += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            }
          }
        }

        setDisplayText(currentText);
        frame++;

        if (frame > totalFrames) {
          setDisplayText(text);
          isAnimatingRef.current = false;
          clearInterval(intervalId);
        }
      }, speed);
    };

    timeoutId = setTimeout(startAnimation, delay);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text, speed, delay, scrambleSteps, animateOnMount]);

  // If we are using monospace, we don't need absolute-overlay layout preservation
  if (useMonospace) {
    return (
      <span className={`${className} inline-block font-mono`} aria-label={text}>
        {displayText}
      </span>
    );
  }

  // To prevent layout shifts on non-monospace (proportional) fonts:
  // Render the final text invisibly to hold the container size,
  // and render the scrambled text absolutely positioned on top.
  return (
    <span className={`${className} relative inline-block`} aria-label={text}>
      {/* Invisible layout preserver */}
      <span className="invisible select-none pointer-events-none block whitespace-pre" aria-hidden="true">
        {text}
      </span>
      {/* Absolute overlay displaying the scramble */}
      <span className="absolute inset-0 block whitespace-pre">
        {displayText}
      </span>
    </span>
  );
}
