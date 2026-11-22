// Shared look and feel for Sisu. New UI should take its colours, radii and
// shadows from here so screens stay consistent.

export const colors = {
  brand: '#16856B',
  brandDark: '#126B58',
  brandDeep: '#0E6652',
  brandTint: '#E8F5F0',
  brandTintStrong: '#E1F3EB',
  brandBorder: '#C5E5D8',

  background: '#F5F8F7',
  surface: '#FFFFFF',
  border: '#E7EEEA',
  inputBorder: '#D0D5DD',

  text: '#153E35',
  textBody: '#475467',
  textMuted: '#667085',
  textFaint: '#98A2B3',

  danger: '#B42318',
  white: '#FFFFFF',
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

// A soft, low shadow that works on Android (elevation) and iOS/web (shadow*).
export const shadow = {
  card: {
    shadowColor: '#0B3B2E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  raised: {
    shadowColor: '#0B3B2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 5,
  },
  nav: {
    shadowColor: '#0B3B2E',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
};

// Slight "pressed in" look used by tappable cards and buttons.
export const pressed = {
  opacity: 0.9,
  transform: [{ scale: 0.985 }],
};