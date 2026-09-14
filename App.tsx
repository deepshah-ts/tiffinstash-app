import AsyncStorage from '@react-native-async-storage/async-storage';
import {Image} from 'expo-image';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Alert, AppState, Keyboard, Linking, Platform, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Switch, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import BrandFonts from './src/components/BrandFonts';
import ShopBrowser from './src/components/ShopBrowser';
import {Text, TextInput} from './src/components/Typography';
import {ActionButton, BannerCarousel, BottomSheet, CircleButton, CollectionRail, EmptyState, Icon, InfoRow, ProductCard, ProductRailView, QuickLinks, RemoteImage, SectionHeader, SupportCard, ui} from './src/components/NativeUI';
import {ContentProvider, copyValue, imageUrl, useContent} from './src/services/content';
import {disableReminders, enableReminders, reminderIsEnabled} from './src/services/reminders';
import {C} from './src/theme';
import type {AppConfig, BrowserRequest, HomeSection, Preferences, Product, TabId} from './src/types';
import {activeMessages, contactUrl, filterProducts, formatTime, normalisePreferences, parseTime, safeNotificationTab, safeStoreUrl, searchUrl, sortEnabled} from './lib/core.cjs';

const STORAGE_KEY = 'tiffinstash-native-v2:preferences';
const DEFAULT_PREFS: Preferences = {city: 'All areas', favourites: [], reminderHour: 11, reminderMinute: 30, dismissedMessages: []};
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Please try again.';

function Maintenance({config}: {config: AppConfig}) {
  return <SafeAreaView style={s.maintenance}><Image source={require('./assets/logo.png')} contentFit="contain" style={s.maintenanceLogo}/><View style={s.maintenanceIcon}><Icon name="restaurant-outline" size={44} color={C.orange}/></View><Text style={s.maintenanceTitle}>{config.settings.maintenanceTitle}</Text><Text style={s.maintenanceBody}>{config.settings.maintenanceBody}</Text><ActionButton label={config.settings.maintenanceCtaLabel} onPress={() => Linking.openURL('https://tiffinstash.com')}/></SafeAreaView>;
}

function AppContent() {
  const {config, source, refreshing, warning, refresh} = useContent();
  const [tab, setTab] = useState<TabId>('home');
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const [query, setQuery] = useState('');
  const [diet, setDiet] = useState('All');
  const [savedOnly, setSavedOnly] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderOn, setReminderOn] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [timeText, setTimeText] = useState('11:30');
  const [browser, setBrowser] = useState<BrowserRequest | null>(null);
  const [browserVisible, setBrowserVisible] = useState(false);
  const serial = useRef(0);
  const scroll = useRef<ScrollView>(null);
  const writeQueue = useRef(Promise.resolve());
  const knownProductIds = useMemo(() => config.products.map(product => product.id), [config.products]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!active || !raw) return;
      const next = normalisePreferences(JSON.parse(raw), knownProductIds, config.cities) as Preferences;
      setPrefs(next); setTimeText(formatTime(next.reminderHour, next.reminderMinute));
    }).catch(() => active && setStorageWarning(true)).finally(() => active && setHydrated(true));
    return () => {active = false;};
  }, []);
  useEffect(() => {if (hydrated) setPrefs(current => normalisePreferences(current, knownProductIds, config.cities) as Preferences);}, [config.cities, hydrated, knownProductIds]);
  useEffect(() => {
    if (!hydrated) return;
    const snapshot = JSON.stringify(prefs);
    writeQueue.current = writeQueue.current.catch(() => {}).then(() => AsyncStorage.setItem(STORAGE_KEY, snapshot)).catch(() => setStorageWarning(true));
  }, [prefs, hydrated]);
  useEffect(() => {
    let active = true;
    const sync = () => reminderIsEnabled().then(value => active && setReminderOn(value)).catch(() => {});
    sync(); const subscription = AppState.addEventListener('change', state => state === 'active' && sync());
    return () => {active = false; subscription.remove();};
  }, []);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true; let unsubscribe: (() => void) | undefined;
    import('expo-notifications').then(async Notifications => {
      if (!active) return;
      const listener = Notifications.addNotificationResponseReceivedListener(response => active && setTab(safeNotificationTab(response.notification.request.content.data)));
      unsubscribe = () => listener.remove();
      const last = await Notifications.getLastNotificationResponseAsync();
      if (active && last?.notification.request.content.data?.kind === 'local-meal-reminder') setTab('plan');
    }).catch(() => {});
    return () => {active = false; unsubscribe?.();};
  }, []);

  const chooseTab = useCallback((id: TabId) => {Keyboard.dismiss(); setTab(id); scroll.current?.scrollTo({y: 0, animated: false});}, []);
  const openShop = useCallback((path: string, title: string) => {
    const url = safeStoreUrl(path);
    if (!url) return Alert.alert('Link unavailable', 'This spreadsheet row does not contain a valid TiffinStash storefront link.');
    setBrowser({url, title, serial: ++serial.current}); setBrowserVisible(true);
  }, []);
  useEffect(() => {
    const route = (url: string | null) => {
      if (!url) return;
      const storeUrl = safeStoreUrl(url); if (storeUrl) return openShop(storeUrl, 'TiffinStash');
      try {
        const parsed = new URL(url); if (parsed.protocol !== 'tiffinstash:') return;
        const destination = (parsed.hostname || parsed.pathname.replace(/^\//, '')).toLowerCase();
        const mapped = destination === 'browse' ? 'explore' : destination;
        if (['home', 'explore', 'plan', 'orders', 'account'].includes(mapped)) chooseTab(mapped as TabId);
      } catch {}
    };
    Linking.getInitialURL().then(route).catch(() => {});
    const subscription = Linking.addEventListener('url', event => route(event.url));
    return () => subscription.remove();
  }, [chooseTab, openShop]);

  const openContact = useCallback((id: string) => {
    const action = config.contactActions.find(item => item.id === id && item.enabled) || config.contactActions.find(item => item.id === 'general_support' && item.enabled);
    const url = action ? contactUrl(action, config.settings) : null;
    if (!url) return Alert.alert('Contact TiffinStash', `Email ${config.settings.supportEmail} for help.`);
    Linking.openURL(url).catch(() => Alert.alert('Contact TiffinStash', `Email ${config.settings.supportEmail} for help.`));
  }, [config.contactActions, config.settings]);
  const toggleSave = useCallback((id: string) => setPrefs(current => ({...current, favourites: current.favourites.includes(id) ? current.favourites.filter(item => item !== id) : [...current.favourites, id]})), []);
  const showSaved = useCallback(() => {setSavedOnly(true); setQuery(''); setDiet('All'); chooseTab('explore');}, [chooseTab]);
  const changeReminder = async (on: boolean) => {
    const parsed = parseTime(timeText);
    if (on && !parsed) return Alert.alert('Enter a valid time', 'Use 24-hour time, for example 11:30 or 18:00.');
    setReminderBusy(true);
    try {
      if (on && parsed) {await enableReminders(parsed.hour, parsed.minute); setPrefs(current => ({...current, reminderHour: parsed.hour, reminderMinute: parsed.minute}));}
      else await disableReminders();
      setReminderOn(on); Alert.alert(on ? 'Reminder saved' : 'Reminder turned off', on ? 'A personal reminder is scheduled Monday to Friday in your phone’s local time. It is not linked to an order or delivery.' : 'Your personal meal reminders have been removed.');
    } catch (error) {setReminderOn(await reminderIsEnabled().catch(() => false)); Alert.alert('Reminder not changed', errorMessage(error));}
    finally {setReminderBusy(false);}
  };

  const activeMessage = useMemo(() => activeMessages(config.messages).find(message => !prefs.dismissedMessages.includes(message.id)), [config.messages, prefs.dismissedMessages]);
  const visibleTabs = useMemo(() => sortEnabled(config.navigation).filter(item => item.target === 'native'), [config.navigation]);
  const allProducts = useMemo(() => sortEnabled(config.products), [config.products]);
  const filteredProducts = useMemo(() => filterProducts(allProducts, {query, diet, city: prefs.city, savedOnly, favourites: prefs.favourites}) as Product[], [allProducts, diet, prefs.city, prefs.favourites, query, savedOnly]);
  const dietOptions = useMemo(() => ['All', ...Array.from(new Set(allProducts.map(product => product.diet).filter(Boolean)))], [allProducts]);
  const refreshControl = config.featureFlags.pullToRefresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.orange} colors={[C.orange]}/> : undefined;
  const renderHomeSection = (section: HomeSection) => {
    if (section.type === 'banners') return <BannerCarousel key={section.id} config={config} banners={config.banners} openShop={openShop}/>;
    if (section.type === 'collections') return <CollectionRail key={section.id} config={config} title={section.title} subtitle={section.subtitle} openShop={openShop}/>;
    if (section.type === 'product_rail') return <ProductRailView key={section.id} config={config} railId={section.referenceId} titleOverride={section.title} subtitleOverride={section.subtitle} favourites={prefs.favourites} toggleSave={toggleSave} openShop={openShop}/>;
    if (section.type === 'quick_links') return <QuickLinks key={section.id} config={config} title={section.title} subtitle={section.subtitle} openShop={openShop}/>;
    if (section.type === 'message') return <SupportCard key={section.id} title={section.title} subtitle={section.subtitle} onPress={() => openContact(section.referenceId)}/>;
    return null;
  };

  if (config.settings.maintenanceMode) return <Maintenance config={config}/>;
  return <SafeAreaView style={s.app} edges={['top', 'bottom']}>
    <StatusBar barStyle="dark-content" backgroundColor={C.paper}/>
    <View style={s.appFrame} accessibilityElementsHidden={browserVisible} importantForAccessibility={browserVisible ? 'no-hide-descendants' : 'auto'}>
      {config.settings.announcementEnabled && config.featureFlags.showAnnouncement && <View style={s.announcement}><Icon name="sparkles" size={14} color={C.paper}/><Text numberOfLines={1} style={s.announcementText}>{config.settings.announcementText}</Text></View>}
      <View style={s.header}><View style={s.headerBrand}><RemoteImage uri={imageUrl(config, 'logo_wordmark')} alt="TiffinStash" contentFit="contain" style={s.logo}/>{config.featureFlags.cityPicker && <Pressable accessibilityRole="button" accessibilityLabel="Choose browsing area" onPress={() => setCityOpen(true)} style={s.locationButton}><Icon name="location-outline" size={14} color={C.orange}/><Text numberOfLines={1} style={s.locationText}>{prefs.city}</Text><Icon name="chevron-down" size={13} color={C.muted}/></Pressable>}</View>{config.featureFlags.favorites && <CircleButton label="Saved favourites" icon={prefs.favourites.length ? 'heart' : 'heart-outline'} active={prefs.favourites.length > 0} onPress={showSaved}/>}<CircleButton label="Open Shopify cart" icon="bag-handle-outline" onPress={() => openShop('/cart', 'Your cart')}/></View>
      {(warning || refreshing) && <View style={s.syncNotice}><Icon name={warning ? 'cloud-offline-outline' : 'sync-outline'} size={16} color={C.primaryInk}/><Text style={s.syncText}>{warning ? `${copyValue(config, 'offline_title')}. ${copyValue(config, 'offline_body')}` : copyValue(config, 'refreshing_label')}</Text></View>}
      <ScrollView ref={scroll} refreshControl={refreshControl} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        {tab === 'home' && <>{sortEnabled(config.homeSections).map(renderHomeSection)}{config.featureFlags.inAppMessages && !!activeMessage && <View style={s.messageCard}><View style={s.messageTop}><View style={s.messageIcon}><Icon name="sparkles" size={20} color={C.orange}/></View><Pressable accessibilityRole="button" accessibilityLabel="Dismiss message" hitSlop={10} onPress={() => setPrefs(current => ({...current, dismissedMessages: [...current.dismissedMessages, activeMessage.id]}))}><Icon name="close" size={20} color={C.muted}/></Pressable></View><Text style={s.messageTitle}>{activeMessage.title}</Text><Text style={s.messageBody}>{activeMessage.body}</Text>{!!activeMessage.ctaLabel && !!activeMessage.path && <Pressable accessibilityRole="button" onPress={() => openShop(activeMessage.path, activeMessage.title)}><Text style={s.textLink}>{activeMessage.ctaLabel} →</Text></Pressable>}</View>}<Text style={s.truthNote}>{copyValue(config, 'shopify_truth_note')}</Text></>}

        {tab === 'explore' && <><Text style={s.eyebrow}>{copyValue(config, 'browse_eyebrow')}</Text><Text style={s.pageTitle}>{savedOnly ? copyValue(config, 'favourites_title') : copyValue(config, 'browse_title')}</Text><Text style={s.pageBody}>{copyValue(config, 'browse_body')}</Text><View style={s.searchBox}><Icon name="search" size={21} color={C.muted}/><TextInput accessibilityLabel="Search featured meals" value={query} onChangeText={setQuery} placeholder={copyValue(config, 'browse_search_placeholder')} placeholderTextColor="#777A82" returnKeyType="search" onSubmitEditing={() => Keyboard.dismiss()} style={s.searchInput}/>{!!query && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')}><Icon name="close-circle" size={22} color={C.muted}/></Pressable>}</View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRail}>{dietOptions.map(option => <Pressable key={option} accessibilityRole="button" accessibilityState={{selected: diet === option}} onPress={() => setDiet(option)} style={[s.filterChip, diet === option && s.filterChipActive]}><Text style={[s.filterText, diet === option && s.filterTextActive]}>{option}</Text></Pressable>)}{config.featureFlags.favorites && <Pressable accessibilityRole="button" accessibilityState={{selected: savedOnly}} onPress={() => setSavedOnly(current => !current)} style={[s.filterChip, savedOnly && s.filterChipActive]}><Icon name={savedOnly ? 'heart' : 'heart-outline'} size={15} color={savedOnly ? C.paper : C.ink}/><Text style={[s.filterText, savedOnly && s.filterTextActive]}>Saved</Text></Pressable>}</ScrollView><SectionHeader title={`${filteredProducts.length} featured ${filteredProducts.length === 1 ? 'pick' : 'picks'}`} actionLabel={prefs.city} onAction={() => setCityOpen(true)}/>{filteredProducts.length ? <View style={ui.productGrid}>{filteredProducts.map(product => <ProductCard key={product.id} grid config={config} product={product} saved={prefs.favourites.includes(product.id)} onSave={() => toggleSave(product.id)} onOpen={() => openShop(product.path, product.title)}/>)}</View> : <EmptyState icon="search-outline" title={copyValue(config, 'browse_empty_title')} body={copyValue(config, 'browse_empty_body')}/>}<ActionButton label={query ? 'Search all Shopify products' : 'Browse the full Shopify catalogue'} onPress={() => openShop(query ? searchUrl(query) : '/collections/all', 'Explore all meals')}/><Text style={s.truthNote}>{copyValue(config, 'shopify_truth_note')}</Text></>}

        {tab === 'plan' && <><Text style={s.eyebrow}>{copyValue(config, 'plan_eyebrow')}</Text><Text style={s.pageTitle}>{copyValue(config, 'plan_title')}</Text><View style={s.featureCard}><View style={s.featureIcon}><Icon name="calendar-outline" size={31} color={C.orange}/></View><Text style={s.featureTitle}>Manage your meal plan</Text><Text style={s.pageBody}>{copyValue(config, 'plan_body')}</Text><ActionButton label={copyValue(config, 'plan_primary_cta')} onPress={() => openShop('/account', 'Your Shopify account')}/><ActionButton secondary label={copyValue(config, 'plan_secondary_cta')} icon="mail-outline" onPress={() => openContact('plan_change')}/><Text style={s.truthNote}>{copyValue(config, 'plan_disclaimer')}</Text></View>{config.featureFlags.localReminders && <InfoRow icon="alarm-outline" title={copyValue(config, 'reminder_title')} subtitle={reminderOn ? `Weekdays at ${formatTime(prefs.reminderHour, prefs.reminderMinute)}` : 'Optional · stored only on this device'} onPress={() => {setTimeText(formatTime(prefs.reminderHour, prefs.reminderMinute)); setReminderOpen(true);}}/>}<SupportCard title="Need help with your schedule?" subtitle="Send the team a plan-change request" onPress={() => openContact('plan_change')}/></>}

        {tab === 'orders' && <><Text style={s.eyebrow}>{copyValue(config, 'orders_eyebrow')}</Text><Text style={s.pageTitle}>{copyValue(config, 'orders_title')}</Text><View style={s.featureCard}><View style={s.featureIcon}><Icon name="receipt-outline" size={31} color={C.orange}/></View><Text style={s.featureTitle}>Your secure order history</Text><Text style={s.pageBody}>{copyValue(config, 'orders_body')}</Text><ActionButton label={copyValue(config, 'orders_cta')} onPress={() => openShop('/account', 'Your orders')}/></View><SupportCard title="Need a delivery update?" subtitle="Message TiffinStash with your order number" onPress={() => openContact('delivery_help')}/></>}

        {tab === 'account' && <><Text style={s.eyebrow}>{copyValue(config, 'account_eyebrow')}</Text><Text style={s.pageTitle}>{copyValue(config, 'account_title')}</Text><View style={s.accountHero}><View style={s.avatar}><Icon name="person-outline" size={31} color={C.orange}/></View><View style={s.flex}><Text style={s.featureTitle}>Your TiffinStash account</Text><Text style={s.pageBody}>{copyValue(config, 'account_body')}</Text></View></View><ActionButton label={copyValue(config, 'account_cta')} onPress={() => openShop('/account', 'Your Shopify account')}/><View style={s.infoGroup}>{config.featureFlags.favorites && <InfoRow icon="heart-outline" title={copyValue(config, 'favourites_title')} subtitle={`${prefs.favourites.length} saved on this device`} onPress={showSaved}/>} {config.featureFlags.cityPicker && <InfoRow icon="location-outline" title={copyValue(config, 'city_title')} subtitle={prefs.city} onPress={() => setCityOpen(true)}/>} {config.featureFlags.localReminders && <InfoRow icon="alarm-outline" title={copyValue(config, 'reminder_title')} subtitle={reminderOn ? `Weekdays · ${formatTime(prefs.reminderHour, prefs.reminderMinute)}` : 'Off'} onPress={() => setReminderOpen(true)}/>}</View><View style={s.infoGroup}><InfoRow icon="chatbubble-ellipses-outline" title="Talk to TiffinStash" subtitle="Meal plans, orders and delivery help" onPress={() => openContact('general_support')}/><InfoRow icon="shield-checkmark-outline" title="Privacy policy" onPress={() => openShop('/policies/privacy-policy', 'Privacy policy')}/><InfoRow icon="mail-outline" title="Account and privacy requests" subtitle="Email the TiffinStash team" onPress={() => openContact('privacy_request')}/></View>{storageWarning && <Text accessibilityRole="alert" style={s.errorText}>Some preferences could not be saved and may reset when the app closes.</Text>}<Pressable accessibilityRole="button" onPress={refresh} style={s.versionBlock}><Text style={s.version}>TIFFINSTASH MOBILE 5.0 · CONTENT {config.meta.contentVersion}</Text><Text style={s.versionDetail}>{source === 'remote' ? 'Spreadsheet content is current' : source === 'cache' ? 'Using the last saved spreadsheet content' : 'Using built-in launch content'} · Tap to refresh</Text></Pressable></>}
        <View style={s.scrollEnd}/>
      </ScrollView>
      <View accessibilityRole="tablist" style={s.tabBar}>{visibleTabs.map(item => {const selected = item.id === tab; return <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{selected}} onPress={() => chooseTab(item.id)} style={({pressed}) => [s.tab, pressed && ui.pressed]}><View style={[s.tabIcon, selected && s.tabIconActive]}><Icon name={selected ? item.icon.replace('-outline', '') : item.icon} size={22} color={selected ? C.orange : C.muted}/></View><Text numberOfLines={1} style={[s.tabLabel, selected && s.tabLabelActive]}>{item.label}</Text></Pressable>;})}</View>
    </View>

    <BottomSheet visible={cityOpen} title={copyValue(config, 'city_sheet_title')} onClose={() => setCityOpen(false)}><Text style={ui.sheetBody}>{copyValue(config, 'city_sheet_body')}</Text><ScrollView style={ui.sheetList}>{config.cities.map(city => <Pressable key={city} accessibilityRole="button" accessibilityState={{selected: prefs.city === city}} onPress={() => {setPrefs(current => ({...current, city})); setCityOpen(false);}} style={({pressed}) => [ui.cityRow, pressed && ui.pressed]}><Text style={ui.infoTitle}>{city}</Text><Icon name={prefs.city === city ? 'radio-button-on' : 'radio-button-off'} size={21} color={prefs.city === city ? C.orange : C.muted}/></Pressable>)}</ScrollView></BottomSheet>
    <BottomSheet visible={reminderOpen} title={copyValue(config, 'reminder_sheet_title')} onClose={() => !reminderBusy && setReminderOpen(false)}><Text style={ui.sheetBody}>{copyValue(config, 'reminder_sheet_body')}</Text><View style={ui.settingRow}><Text style={ui.infoTitle}>Time (24-hour)</Text><TextInput accessibilityLabel="Reminder time in 24-hour format" value={timeText} onChangeText={setTimeText} placeholder="11:30" maxLength={5} keyboardType="numbers-and-punctuation" style={s.timeInput}/></View><View style={ui.settingRow}><Text style={ui.infoTitle}>Weekday reminders</Text><Switch accessibilityLabel="Enable personal reminders" value={reminderOn} disabled={reminderBusy} onValueChange={changeReminder} trackColor={{false: '#D5D5D8', true: C.orange}} thumbColor={C.paper}/></View>{reminderOn && <ActionButton label="Save reminder time" disabled={reminderBusy} onPress={() => changeReminder(true)}/>}<Text style={ui.truthNote}>You can turn this off at any time. No order or delivery information is inferred.</Text></BottomSheet>
    <ShopBrowser request={browser} visible={browserVisible} onClose={() => setBrowserVisible(false)}/>
  </SafeAreaView>;
}

export default function App() {return <SafeAreaProvider><BrandFonts><ContentProvider><AppContent/></ContentProvider></BrandFonts></SafeAreaProvider>;}

const s = StyleSheet.create({
  app: {flex: 1, backgroundColor: C.paper}, appFrame: {flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center', backgroundColor: C.paper}, flex: {flex: 1},
  announcement: {minHeight: 29, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: C.charcoal, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center'}, announcementText: {fontSize: 10, letterSpacing: .25, color: C.paper, fontWeight: '600'},
  header: {paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.paper}, headerBrand: {flex: 1, alignItems: 'flex-start'}, logo: {width: 136, height: 30}, locationButton: {marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: 190}, locationText: {fontSize: 11, color: C.muted, fontWeight: '600'},
  syncNotice: {marginHorizontal: 20, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: C.orangeSoft, flexDirection: 'row', alignItems: 'center', gap: 8}, syncText: {flex: 1, fontSize: 10, lineHeight: 15, color: C.primaryInk}, content: {paddingHorizontal: 20, paddingBottom: 20, gap: 22},
  truthNote: {fontSize: 10, lineHeight: 16, color: C.muted}, textLink: {fontSize: 12, lineHeight: 18, color: C.primaryInk, fontWeight: '700'}, messageCard: {padding: 18, borderRadius: 22, backgroundColor: '#FFF8D7', gap: 7}, messageTop: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}, messageIcon: {width: 38, height: 38, borderRadius: 13, backgroundColor: '#FFFFFFAA', alignItems: 'center', justifyContent: 'center'}, messageTitle: {fontSize: 15, lineHeight: 21, color: C.ink, fontWeight: '700'}, messageBody: {fontSize: 11, lineHeight: 18, color: C.muted},
  eyebrow: {fontSize: 9, lineHeight: 14, letterSpacing: 1.5, color: C.orange, fontWeight: '700', marginTop: 8}, pageTitle: {fontSize: 32, lineHeight: 39, letterSpacing: -1.2, color: C.ink, fontWeight: '800'}, pageBody: {fontSize: 13, lineHeight: 21, color: C.muted},
  searchBox: {minHeight: 54, borderRadius: 17, borderWidth: 1, borderColor: C.line, backgroundColor: C.neutral, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14}, searchInput: {flex: 1, minHeight: 52, fontSize: 12, color: C.ink}, filterRail: {gap: 8, paddingRight: 4}, filterChip: {minHeight: 39, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper, flexDirection: 'row', alignItems: 'center', gap: 5}, filterChipActive: {backgroundColor: C.orange, borderColor: C.orange}, filterText: {fontSize: 11, color: C.ink, fontWeight: '600'}, filterTextActive: {color: C.paper},
  featureCard: {padding: 21, borderRadius: 25, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper, gap: 14}, featureIcon: {width: 62, height: 62, borderRadius: 21, backgroundColor: C.orangeSoft, alignItems: 'center', justifyContent: 'center'}, featureTitle: {fontSize: 18, lineHeight: 24, color: C.ink, fontWeight: '700'}, infoGroup: {borderRadius: 20, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, overflow: 'hidden'}, accountHero: {paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 14}, avatar: {width: 64, height: 64, borderRadius: 22, backgroundColor: C.orangeSoft, alignItems: 'center', justifyContent: 'center'},
  errorText: {fontSize: 10, lineHeight: 16, color: C.error, backgroundColor: '#FDECEC', borderRadius: 12, padding: 12}, versionBlock: {alignItems: 'center', paddingVertical: 10, gap: 3}, version: {fontSize: 8, letterSpacing: 1.2, color: C.muted, fontWeight: '600'}, versionDetail: {fontSize: 9, color: C.muted},
  tabBar: {flexDirection: 'row', borderTopWidth: 1, borderColor: C.line, backgroundColor: C.paper, paddingHorizontal: 4, paddingTop: 7, paddingBottom: 3}, tab: {flex: 1, minHeight: 59, alignItems: 'center', gap: 3}, tabIcon: {width: 43, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center'}, tabIconActive: {backgroundColor: C.orangeSoft}, tabLabel: {fontSize: 9, color: C.muted, fontWeight: '500'}, tabLabelActive: {color: C.ink, fontWeight: '700'}, scrollEnd: {height: 6},
  timeInput: {width: 104, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.neutral, textAlign: 'center', fontSize: 19, color: C.ink, fontWeight: '600'}, maintenance: {flex: 1, padding: 28, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', gap: 16}, maintenanceLogo: {width: 210, height: 48, marginBottom: 18}, maintenanceIcon: {width: 82, height: 82, borderRadius: 28, backgroundColor: C.orangeSoft, alignItems: 'center', justifyContent: 'center'}, maintenanceTitle: {fontSize: 27, lineHeight: 34, textAlign: 'center', color: C.ink, fontWeight: '800'}, maintenanceBody: {maxWidth: 420, fontSize: 13, lineHeight: 21, textAlign: 'center', color: C.muted}
});
