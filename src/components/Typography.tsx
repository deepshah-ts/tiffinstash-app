import React, {createContext, forwardRef, useContext} from 'react';
import {
  Text as NativeText, TextInput as NativeTextInput, StyleSheet,
  type TextProps, type TextInputProps, type TextStyle,
} from 'react-native';
import {C, FONT_FAMILIES} from '../theme';

type Weight = keyof typeof FONT_FAMILIES;
const WeightContext = createContext<Weight>(400);
function weightFor(value: TextStyle['fontWeight'], inherited: Weight): Weight {
  if (value == null) return inherited;
  if (value === 'normal') return 400;
  if (value === 'bold') return 700;
  const n = Number(value);
  if (!Number.isFinite(n)) return inherited;
  return Math.max(400, Math.min(800, Math.round(n / 100) * 100)) as Weight;
}

/** Every app-owned text element uses a real Poppins face, not synthetic bold.
 * Context preserves the weight of nested Text, such as the two-line hero.
 * Platform-native alerts/keyboards and Shopify web content remain OS/site-owned. */
export const Text = forwardRef<NativeText, TextProps>(function BrandText({style, children, ...props}, ref) {
  const inherited = useContext(WeightContext);
  const flat = StyleSheet.flatten(style) || {};
  const weight = weightFor(flat.fontWeight, inherited);
  return <WeightContext.Provider value={weight}>
    <NativeText ref={ref} {...props} style={[
      {color: C.ink}, style,
      {fontFamily: FONT_FAMILIES[weight], fontWeight: 'normal'},
    ]}>{children}</NativeText>
  </WeightContext.Provider>;
});

export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function BrandInput({style, ...props}, ref) {
  const flat = StyleSheet.flatten(style) || {};
  const weight = weightFor(flat.fontWeight, 400);
  return <NativeTextInput ref={ref} {...props} style={[
    {color: C.ink}, style,
    {fontFamily: FONT_FAMILIES[weight], fontWeight: 'normal'},
  ]}/>;
});
