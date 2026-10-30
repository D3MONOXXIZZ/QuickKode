export const theme = {
  colors: {
    // Base backgrounds
    bgBase: '#0A0B0E',
    bgSurface: '#12141A',
    bgCard: '#181B23',
    bgCardHover: '#222632',
    bgCapsule: '#151722',
    bgInput: '#1A1D28',

    // Hairline borders
    borderSubtle: '#232733',
    borderMedium: '#313645',
    borderFocus: '#7C3AED',

    // Accents & Gradients
    accentPrimary: '#7C3AED',
    accentPrimaryLight: '#A78BFA',
    accentPrimaryDim: 'rgba(124, 58, 237, 0.16)',

    accentCyan: '#06B6D4',
    accentCyanDim: 'rgba(6, 182, 212, 0.16)',

    accentBlue: '#3B82F6',
    accentBlueDim: 'rgba(59, 130, 246, 0.16)',

    accentEmerald: '#10B981',
    accentEmeraldDim: 'rgba(16, 185, 129, 0.16)',

    accentAmber: '#F59E0B',
    accentAmberDim: 'rgba(245, 158, 11, 0.16)',

    accentRose: '#EF4444',
    accentRoseDim: 'rgba(239, 68, 68, 0.16)',

    // Text & Content
    textPrimary: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    textHighlight: '#C4B5FD',
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  fonts: {
    code: 'monospace',
  },
} as const;

export type Theme = typeof theme;
