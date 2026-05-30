import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './providers/**/*.{ts,tsx}',
  ],
  theme: {
    container: { center: true, padding: '1.5rem', screens: { '2xl': '1440px' } },
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'JetBrains Mono', 'monospace'],
      },
      colors: {
        /* Page structure */
        'bg-page':    'var(--bg-page)',
        'bg-card':    'var(--bg-card)',
        'bg-surface': 'var(--bg-surface)',

        /* Text */
        'text-primary':   'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary':  'var(--text-tertiary)',

        /* Brand */
        brand: {
          DEFAULT: 'var(--brand)',
          hover:   'var(--brand-hover)',
          subtle:  'var(--brand-subtle)',
        },

        /* Tiers */
        tier: {
          diamond:  'var(--tier-diamond)',
          platinum: 'var(--tier-platinum)',
          gold:     'var(--tier-gold)',
          silver:   'var(--tier-silver)',
          bronze:   'var(--tier-bronze)',
        },

        /* Semantic */
        success: {
          DEFAULT: 'var(--success)',
          hover:   'var(--success-hover)',
          subtle:  'var(--success-subtle)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          subtle:  'var(--warning-subtle)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          hover:   'var(--danger-hover)',
          subtle:  'var(--danger-subtle)',
        },

        /* shadcn mapped tokens */
        border:      'var(--border)',
        input:       'var(--border)',
        ring:        'var(--ring)',
        background:  'var(--background)',
        foreground:  'var(--foreground)',
        primary: {
          DEFAULT:    'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT:    'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT:    'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT:    'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT:    'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        card: {
          DEFAULT:    'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT:    'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '6px',
        full: '9999px',
      },
      borderWidth: {
        DEFAULT: '0.5px',
        '0':     '0',
        '1':     '1px',
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        xs:    ['11px', { lineHeight: '16px' }],
        sm:    ['12px', { lineHeight: '18px' }],
        base:  ['13px', { lineHeight: '20px' }],
        md:    ['14px', { lineHeight: '22px' }],
        lg:    ['16px', { lineHeight: '24px' }],
        xl:    ['20px', { lineHeight: '28px' }],
        '2xl': ['22px', { lineHeight: '30px' }],
        '3xl': ['28px', { lineHeight: '36px' }],
      },
      keyframes: {
        'fade-in-down': {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'skeleton-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
      },
      animation: {
        'fade-in-down':  'fade-in-down 0.25s ease-out',
        'fade-in':       'fade-in 0.2s ease-out',
        'skeleton':      'skeleton-pulse 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
};

export default config;
