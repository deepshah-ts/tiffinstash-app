import React from 'react';
import {Linking, Pressable, StyleSheet, View} from 'react-native';
import type {BrowserRequest} from '../types';
import {C} from '../theme';
import {Text} from './Typography';

export default function ShopBrowser({request, visible, onClose}: {request: BrowserRequest | null; visible: boolean; onClose: () => void}) {
  if (!visible || !request) return null;
  return <View style={s.overlay}><View style={s.card}>
    <Text style={s.title}>{request.title}</Text>
    <Text style={s.copy}>This browser preview opens the real TiffinStash website in another tab. The iOS and Android builds use a persistent secure shopping view. Orders and payments on Shopify are real.</Text>
    <Pressable accessibilityRole="link" style={s.button} onPress={() => Linking.openURL(request.url).catch(() => {})}><Text style={s.label}>Continue to TiffinStash ↗</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={onClose} style={s.close}><Text>Back to preview</Text></Pressable>
  </View></View>;
}

const s = StyleSheet.create({
  overlay: {position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#0008', justifyContent: 'center', padding: 24, zIndex: 40},
  card: {backgroundColor: C.paper, borderRadius: 24, padding: 26, gap: 18, maxWidth: 430, alignSelf: 'center'}, title: {fontSize: 24, fontWeight: '700', color: C.ink}, copy: {fontSize: 16, lineHeight: 24, color: C.muted}, button: {backgroundColor: C.primary, padding: 16, borderRadius: 14}, label: {color: C.paper, fontWeight: '700', textAlign: 'center'}, close: {padding: 16, alignItems: 'center'}
});
