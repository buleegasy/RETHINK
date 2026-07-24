import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: [
    "./index.html",
    "./src/App.tsx",
  ],
  theme: {
    extend: {
      colors: {
        // Luminous Clarity Palette
        surface: {
          DEFAULT: '#faf9f6',
          dim: '#dbdad7',
          bright: '#faf9f6',
          container: '#efeeeb',
          'container-lowest': '#ffffff',
          'container-low': '#f4f3f1',
          'container-high': '#e9e8e5',
          'container-highest': '#e3e2e0',
          variant: '#e3e2e0',
          tint: '#835500',
        },
        on: {
          surface: '#1a1c1a',
          'surface-variant': '#514536',
          background: '#1a1c1a',
        },
        inverse: {
          surface: '#2f312f',
          'on-surface': '#f2f1ee',
          primary: '#ffb954',
        },
        outline: {
          DEFAULT: '#837564',
          variant: '#d6c4b0',
        },
        primary: {
          DEFAULT: '#835500',
          container: '#ffb74d',
          fixed: '#ffddb4',
          'fixed-dim': '#ffb954',
        },
        'on-primary': {
          DEFAULT: '#ffffff',
          container: '#714900',
          fixed: '#291800',
          'fixed-variant': '#633f00',
        },
        secondary: {
          DEFAULT: '#3c6842',
          container: '#bdefbe',
          fixed: '#bdefbe',
          'fixed-dim': '#a2d3a4',
        },
        'on-secondary': {
          DEFAULT: '#ffffff',
          container: '#426e47',
          fixed: '#002109',
          'fixed-variant': '#24502c',
        },
        tertiary: {
          DEFAULT: '#7e4a8a',
          container: '#edb0f7',
          fixed: '#fdd6ff',
          'fixed-dim': '#efb1f9',
        },
        'on-tertiary': {
          DEFAULT: '#ffffff',
          container: '#703e7c',
          fixed: '#340141',
          'fixed-variant': '#643370',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        'on-error': {
          DEFAULT: '#ffffff',
          container: '#93000a',
        },
        background: '#faf9f6',
        
        // Aliases mapping old tokens to new semantic tokens to ensure no breaking changes
        gemini: {
          blue: '#835500',       // Map old blue to new primary (Amber)
          'blue-hover': '#ffb74d',
          'blue-light': '#ffddb4',
          'blue-pale': '#f4f3f1',
          'blue-surface': '#faf9f6',
          purple: '#ce93d8',     // Map old purple to soft lavender
          'purple-light': '#edb0f7',
        },
        neon: {
          purple: '#ce93d8', // soft lavender
          green: '#a5d6a7',  // sage green
          blue: '#ffb74d',   // amber
        },
        stage: {
          blue: '#ffb74d',
          green: '#a5d6a7',
          purple: '#ce93d8',
          orange: '#ffb74d', 
          red: '#ba1a1a',    
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['Sora', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      borderRadius: {
        'sm': '0.25rem',
        'DEFAULT': '0.5rem',
        'md': '0.75rem',
        'lg': '1rem',
        'xl': '1.5rem',
        'full': '9999px',
        // Map old specific shapes
        'bubble': '24px',  // Map to xl
        'input': '8px',    // Map to DEFAULT
        'card': '24px',    // Map to xl
        'chip': '9999px',
      },
      spacing: {
        'unit': '8px',
        'gutter': '24px',
        'margin-desktop': '64px',
        'margin-mobile': '20px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(131, 85, 0, 0.05)',
        'md': '0 4px 12px rgba(131, 85, 0, 0.08)',
        'lg': '0 8px 24px rgba(131, 85, 0, 0.1)',
        'xl': '0 12px 32px rgba(131, 85, 0, 0.12)',
        'inner-light': 'inset 0 1px 1px rgba(255, 255, 255, 0.8), inset 0 -1px 1px rgba(131, 117, 100, 0.1)',
        'glow': '0 0 30px rgba(255, 183, 77, 0.2)', // Amber glow
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
