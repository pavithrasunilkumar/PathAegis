/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        void: '#080810',
        surface: '#0f0f1a',
        panel: '#13131f',
        border: '#1e1e30',
        neon: '#a855f7',
        'neon-dim': '#7c3aed',
        'neon-glow': '#c084fc',
        acid: '#39ff14',
        amber: '#f59e0b',
        danger: '#ef4444',
        muted: '#6b7280',
        soft: '#9ca3af',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'scan': 'scan 2s linear infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(168,85,247,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(168,85,247,0.7)' },
        },
      },
      boxShadow: {
        'neon': '0 0 20px rgba(168,85,247,0.4), 0 0 60px rgba(168,85,247,0.15)',
        'neon-lg': '0 0 40px rgba(168,85,247,0.5), 0 0 100px rgba(168,85,247,0.2)',
        'danger': '0 0 20px rgba(239,68,68,0.4)',
        'acid': '0 0 20px rgba(57,255,20,0.3)',
        'panel': '0 8px 32px rgba(0,0,0,0.6)',
        'inner-border': 'inset 0 1px 0 rgba(255,255,255,0.05)',
      },
    },
  },
  plugins: [],
}
