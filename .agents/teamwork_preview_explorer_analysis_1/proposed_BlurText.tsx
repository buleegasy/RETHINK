import { motion } from 'framer-motion';

interface BlurTextProps {
  text: string;
  delay?: number; // Initial delay before animation starts in seconds
  duration?: number; // Duration of each character's animation in seconds
  stagger?: number; // Stagger delay between characters in seconds
  className?: string; // Additional classes for the container
  wordByWord?: boolean; // Whether to animate word-by-word instead of character-by-character
}

export function BlurText({
  text,
  delay = 0,
  duration = 0.8,
  stagger = 0.03,
  className = '',
  wordByWord = false,
}: BlurTextProps) {
  // Split the text into words to ensure correct line wrapping behavior
  const words = text.split(' ');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      filter: 'blur(12px)',
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        duration,
        ease: [0.22, 1, 0.36, 1], // Cubic-bezier for smooth deceleration (quintic ease-out style)
      },
    },
  };

  return (
    <motion.span
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`${className} inline flex-wrap`}
      style={{
        // Ensure proper line-height and layout preservation
        display: 'inline',
      }}
    >
      {words.map((word, wordIdx) => {
        if (wordByWord) {
          return (
            <span key={wordIdx} className="inline-block whitespace-nowrap">
              <motion.span
                variants={itemVariants}
                className="inline-block"
                style={{
                  willChange: 'transform, opacity, filter',
                  marginRight: '0.25em',
                }}
              >
                {word}
              </motion.span>
              {wordIdx < words.length - 1 && <span className="inline-block">&nbsp;</span>}
            </span>
          );
        }

        // Character-by-character split, nested within a word span to prevent awkward character-level wrapping
        const chars = Array.from(word);
        return (
          <span key={wordIdx} className="inline-block whitespace-nowrap">
            {chars.map((char, charIdx) => (
              <motion.span
                key={charIdx}
                variants={itemVariants}
                className="inline-block"
                style={{
                  willChange: 'transform, opacity, filter',
                }}
              >
                {char}
              </motion.span>
            ))}
            {/* Render space after the word wrapper if it's not the last word */}
            {wordIdx < words.length - 1 && (
              <span className="inline-block" aria-hidden="true">
                &nbsp;
              </span>
            )}
          </span>
        );
      })}
    </motion.span>
  );
}
