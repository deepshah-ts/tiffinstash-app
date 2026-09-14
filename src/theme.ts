import brand from '../data/brand.json';

/** Brand tokens verified against the supplied TiffinStash live-theme export. */
export const C = {
  ...brand.ui,
  orange: brand.palette.orange,
  orangeSoft: brand.ui.primarySoft,
  lightOrange: brand.palette.lightOrange,
  yellow: brand.palette.yellow,
  charcoal: brand.palette.charcoal,
  black: brand.palette.black,
};
export const FONT_FAMILIES = {
  400: 'Poppins_400Regular',
  500: 'Poppins_500Medium',
  600: 'Poppins_600SemiBold',
  700: 'Poppins_700Bold',
  800: 'Poppins_800ExtraBold',
} as const;
