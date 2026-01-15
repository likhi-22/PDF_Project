/**
 * Design System Typography
 * Consistent type scale and font weights
 */

export const typography = {
  // Font Families
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'Courier New', 'monospace'],
  },

  // Font Sizes - Mobile First
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.05em' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.025em' }], // 14px
    base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '0' }],          // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.025em' }], // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.025em' }], // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.025em' }],  // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.025em' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.025em' }], // 36px
    '5xl': ['3rem', { lineHeight: '1', letterSpacing: '-0.025em' }],       // 48px
    '6xl': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.025em' }],    // 60px
    '7xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.025em' }],     // 72px
  },

  // Font Weights
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  // Heading Styles
  headings: {
    h1: {
      fontSize: '3rem', // 48px
      lineHeight: '1.1',
      fontWeight: '700',
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '2.25rem', // 36px
      lineHeight: '1.2',
      fontWeight: '700',
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1.875rem', // 30px
      lineHeight: '1.3',
      fontWeight: '600',
      letterSpacing: '-0.025em',
    },
    h4: {
      fontSize: '1.5rem', // 24px
      lineHeight: '1.4',
      fontWeight: '600',
      letterSpacing: '-0.025em',
    },
    h5: {
      fontSize: '1.25rem', // 20px
      lineHeight: '1.5',
      fontWeight: '600',
      letterSpacing: '0',
    },
    h6: {
      fontSize: '1.125rem', // 18px
      lineHeight: '1.5',
      fontWeight: '600',
      letterSpacing: '0',
    },
  },

  // Body Text Styles
  body: {
    large: {
      fontSize: '1.125rem', // 18px
      lineHeight: '1.75rem',
      fontWeight: '400',
    },
    base: {
      fontSize: '1rem', // 16px
      lineHeight: '1.5rem',
      fontWeight: '400',
    },
    small: {
      fontSize: '0.875rem', // 14px
      lineHeight: '1.25rem',
      fontWeight: '400',
    },
  },

  // Caption Styles
  caption: {
    large: {
      fontSize: '0.875rem', // 14px
      lineHeight: '1.25rem',
      fontWeight: '500',
    },
    base: {
      fontSize: '0.75rem', // 12px
      lineHeight: '1rem',
      fontWeight: '500',
    },
    small: {
      fontSize: '0.625rem', // 10px
      lineHeight: '0.875rem',
      fontWeight: '500',
    },
  },
} as const
