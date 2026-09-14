import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Alert, BackHandler, Linking, Pressable, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {WebView, type WebViewNavigation} from 'react-native-webview';
import type {BrowserRequest} from '../types';
import {C} from '../theme';
import {Text} from './Typography';

/** One persistent WebView preserves Shopify cart, login and checkout cookies. */
export default function ShopBrowser({request, visible, onClose}: {request: BrowserRequest | null; visible: boolean; onClose: () => void}) {
  const ref = useRef<WebView>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSerial = useRef(-1);
  const [sourceUrl, setSourceUrl] = useState(request?.url || 'https://tiffinstash.com');
  const [currentUrl, setCurrentUrl] = useState(request?.url || 'https://tiffinstash.com');
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadStalled, setLoadStalled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!request || latestSerial.current === request.serial) return;
    latestSerial.current = request.serial;
    setError(null); setLoadStalled(false); setCurrentUrl(request.url);
    const destination = new URL(request.url);
    destination.searchParams.set('ts_app_navigation', String(request.serial));
    setSourceUrl(destination.href);
  }, [request]);
  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {if (canGoBack) ref.current?.goBack(); else onClose(); return true;});
    return () => subscription.remove();
  }, [canGoBack, onClose, visible]);
  useEffect(() => () => {if (timer.current) clearTimeout(timer.current);}, []);
  if (!request) return null;

  const stopTimer = () => {if (timer.current) clearTimeout(timer.current); setLoading(false); setLoadStalled(false);};
  const onNavigation = (navigation: WebViewNavigation) => {setCanGoBack(navigation.canGoBack); setCurrentUrl(navigation.url);};
  const openBrowser = () => Alert.alert('Open in your browser?', 'Your browser can have a different cart or login. Check your items before paying and never repeat a payment that may still be processing.', [
    {text: 'Stay here', style: 'cancel'},
    {text: 'Open browser', onPress: () => /^https:\/\//i.test(currentUrl) && Linking.openURL(currentUrl).catch(() => Alert.alert('Could not open link'))}
  ]);
  let host = 'tiffinstash.com';
  try {host = new URL(currentUrl).hostname;} catch {}

  return <SafeAreaView edges={['top', 'bottom']} accessibilityViewIsModal style={[s.shell, !visible && s.hidden]}>
    <View style={s.bar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={s.icon} onPress={() => canGoBack ? ref.current?.goBack() : onClose()}><Text style={s.glyph}>‹</Text></Pressable>
      <View style={s.heading}><Text numberOfLines={1} style={s.title}>{request.title}</Text><Text numberOfLines={1} style={s.host}>{host}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Reload page" style={s.icon} onPress={() => Alert.alert('Reload this page?', 'Do not reload while a payment is processing.', [{text: 'Cancel', style: 'cancel'}, {text: 'Reload', onPress: () => {setError(null); ref.current?.reload();}}])}><Text style={s.glyph}>↻</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Close shopping view" style={s.icon} onPress={onClose}><Text style={s.glyph}>×</Text></Pressable>
    </View>
    {loading && <View style={s.progress}><ActivityIndicator size="small" color={C.orange}/><Text style={s.status}>Opening TiffinStash…</Text></View>}
    <WebView
      ref={ref}
      source={{uri: sourceUrl}}
      style={s.webview}
      sharedCookiesEnabled
      thirdPartyCookiesEnabled
      domStorageEnabled
      javaScriptEnabled
      incognito={false}
      cacheEnabled
      allowsBackForwardNavigationGestures
      mixedContentMode="never"
      allowFileAccess={false}
      allowUniversalAccessFromFileURLs={false}
      javaScriptCanOpenWindowsAutomatically={false}
      setSupportMultipleWindows={false}
      originWhitelist={['*']}
      onShouldStartLoadWithRequest={navigation => {
        const url = navigation.url;
        // HTTPS payment, account and Shopify-app redirects stay in one cookie session.
        // No DOM scraping, credential access, injected JavaScript or message bridge is used.
        if (/^https:\/\//i.test(url) || url === 'about:blank') return true;
        if (/^(mailto:|tel:|whatsapp:)/i.test(url)) {
          Alert.alert('Open another app?', 'Continue using the link selected on this page.', [{text: 'Cancel', style: 'cancel'}, {text: 'Continue', onPress: () => Linking.openURL(url).catch(() => Alert.alert('No app found to open this link.'))}]);
        } else Alert.alert('Link not opened', 'This app allows secure HTTPS pages. Use the website in your browser for an unsupported payment or sign-in app.');
        return false;
      }}
      onNavigationStateChange={onNavigation}
      onLoadStart={() => {setLoading(true); setLoadStalled(false); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setLoadStalled(true), 25000);}}
      onLoadEnd={stopTimer}
      onError={() => {stopTimer(); setError('The page could not load. Check your connection and retry.');}}
      onHttpError={event => {if (event.nativeEvent.statusCode >= 400) {stopTimer(); setError(`The store returned an error (${event.nativeEvent.statusCode}).`);}}}
      onContentProcessDidTerminate={() => {stopTimer(); setError('The shopping view stopped. Reload only after checking that no payment is processing.');}}
      onRenderProcessGone={() => {stopTimer(); setError('The shopping view stopped. Reopen the store to continue.');}}
    />
    {(error || loadStalled) && <View style={s.issue}><Text style={s.issueText}>{error || 'Still loading. Check your connection; do not retry a payment already in progress.'}</Text><Pressable accessibilityRole="button" style={s.retry} onPress={() => {setError(null); setLoadStalled(false); ref.current?.reload();}}><Text style={s.retryText}>Retry page</Text></Pressable></View>}
    <Pressable accessibilityRole="button" onPress={openBrowser} style={s.browser}><Text style={s.host}>Having trouble signing in or paying? Open in browser ↗</Text></Pressable>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  shell: {position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: C.paper, zIndex: 50}, hidden: {display: 'none'}, webview: {flex: 1},
  bar: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 1, borderColor: C.line}, heading: {flex: 1}, icon: {minHeight: 48, minWidth: 44, alignItems: 'center', justifyContent: 'center'}, glyph: {fontSize: 30, color: C.ink}, title: {fontSize: 15, fontWeight: '700', color: C.ink}, host: {fontSize: 11, color: C.muted},
  progress: {padding: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8}, status: {fontSize: 12, color: C.muted}, browser: {padding: 12, alignItems: 'center', borderTopWidth: 1, borderColor: C.line}, issue: {padding: 18, backgroundColor: C.orangeSoft}, issueText: {fontSize: 14, lineHeight: 21, color: C.ink}, retry: {paddingVertical: 12}, retryText: {fontWeight: '700', color: C.primaryInk}
});
