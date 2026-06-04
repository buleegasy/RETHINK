import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Gemini MD3 Surface System ──
        surface: {
          DEFAULT: '#FFFFFF',
          dim: '#F0F4F9',               // Gemini's signature bg
          container: '#E8EDF2',          // Container backgrounds
          'container-high': '#DDE3EA',   // Elevated containers
          'container-highest': '#D1D7DE',
        },
        on: {
          surface: '#1F1F1F',            // Primary text (near-black)
          'surface-variant': '#5F6368',  // Secondary text (Google gray)
          'surface-dim': '#9AA0A6',      // Tertiary / placeholder text
        },
        // ── Gemini Brand ──
        gemini: {
          blue: '#4285F4',
          'blue-light': '#8AB4F8',
          'blue-pale': '#D2E3FC',
          'blue-surface': '#E8F0FE',
          purple: '#A142F4',
          'purple-light': '#D7AEFB',
        },
        // ── CBT Stage Colors (Google palette) ──
        stage: {
          blue: '#4285F4',
          green: '#34A853',
          orange: '#F9AB00',
          red: '#EA4335',
          purple: '#A142F4',
        },
        // ── Semantic ──
        error: {
          DEFAULT: '#B3261E',
          container: '#F9DEDC',
        },
        outline: {
          DEFAULT: '#C4C7C5',
          variant: '#E1E3E1',
        },
      },
      fontFamily: {
        sans: ['"Google Sans Text"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Google Sans"', '"Google Sans Text"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'bubble': '32px',
        'input': '32px',
        'card': '24px',
        'chip': '16px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.03)',
        'md': '0 2px 6px rgba(0, 0, 0, 0.05)',
        'lg': '0 8px 16px rgba(0, 0, 0, 0.06)',
        'xl': '0 12px 32px rgba(0, 0, 0, 0.08)',
        'inner-soft': 'inset 0 1px 2px rgba(0, 0, 0, 0.04)',
        'glow': '0 0 20px rgba(66, 133, 244, 0.25)',
      },
      transitionTimingFunction: {
        'md3-standard': 'cubic-bezier(0.2, 0.0, 0, 1.0)',
        'md3-emphasized': 'cubic-bezier(0.05, 0.7, 0.1, 1.0)',
        'md3-decelerate': 'cubic-bezier(0.0, 0.0, 0, 1.0)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.05, 0.7, 0.1, 1.0) forwards',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.05, 0.7, 0.1, 1.0) forwards',
        'message-in': 'messageIn 0.45s cubic-bezier(0.05, 0.7, 0.1, 1.0) forwards',
        'pulse-gentle': 'pulseGentle 2s ease-in-out infinite',
        'sparkle': 'sparkle 3s ease-in-out infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        messageIn: {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        pulseGentle: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        sparkle: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '60%': { opacity: '1', transform: 'scale(1.03)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [
    typography,
  ],
}
