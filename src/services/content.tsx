import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import fallbackJson from '../../data/default-config.json';
import type {
  AppConfig,
  Banner,
  Collection,
  ContactAction,
  ContentState,
  HomeSection,
  InAppMessage,
  NavigationItem,
  Product,
  ProductRail,
  QuickLink,
  TabId
} from '../types';
import {safeImageUrl, safeStoreUrl, sortEnabled} from '../../lib/core.cjs';

const FALLBACK = fallbackJson as AppConfig;
const CACHE_KEY = 'tiffinstash-content-v1:last-good';
const MAX_RESPONSE_BYTES = 1_000_000;
const CONFIG_URL = String(process.env.EXPO_PUBLIC_CONFIG_URL || '').trim();
const ContentContext = createContext<ContentState | null>(null);

type Dict = Record<string, unknown>;
const record = (value: unknown): Dict => value && typeof value === 'object' && !Array.isArray(value) ? value as Dict : {};
const textValue = (value: unknown, fallback = '', max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : fallback;
const numberValue = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};
const booleanValue = (value: unknown, fallback: boolean) => typeof value === 'boolean' ? value : fallback;
const identifier = (value: unknown) => {
  const candidate = textValue(value, '', 64);
  return /^[a-z0-9][a-z0-9_-]*$/i.test(candidate) ? candidate : '';
};
const pathValue = (value: unknown, fallback = '') => {
  const candidate = textValue(value, '', 2048);
  return candidate && safeStoreUrl(candidate) ? candidate : fallback;
};
const colorValue = (value: unknown, fallback: string) => {
  const candidate = textValue(value, '', 9).toUpperCase();
  return /^#[0-9A-F]{6}([0-9A-F]{2})?$/.test(candidate) ? candidate : fallback;
};
const sortOrder = (row: Dict, fallback: number) => numberValue(row.sortOrder, fallback, -10000, 10000);
const enabled = (row: Dict) => booleanValue(row.enabled, true);
const safeRows = <T,>(value: unknown, map: (row: Dict, index: number) => T | null, fallback: T[]): T[] => {
  if (!Array.isArray(value)) return fallback;
  const rows = value.slice(0, 500).map((item, index) => map(record(item), index)).filter(Boolean) as T[];
  return rows.length ? rows : fallback;
};

function normalizeConfig(input: unknown): AppConfig {
  const root = record(input);
  const meta = record(root.meta);
  if (numberValue(meta.schemaVersion, 0, 0, 99) !== FALLBACK.meta.schemaVersion) throw new Error('Unsupported spreadsheet schema.');
  const settings = record(root.settings);
  const assetsInput = record(root.assets);
  const assets = Object.entries(assetsInput).slice(0, 500).reduce<AppConfig['assets']>((out, [key, raw]) => {
    const id = identifier(key);
    const item = record(raw);
    const url = safeImageUrl(textValue(item.url, '', 2048));
    if (id && url) out[id] = {url, altText: textValue(item.altText, id, 180)};
    return out;
  }, {});

  const navigation = safeRows<NavigationItem>(root.navigation, (row, index) => {
    const id = identifier(row.id) as TabId;
    if (!['home', 'explore', 'plan', 'orders', 'account'].includes(id)) return null;
    return {
      id,
      label: textValue(row.label, FALLBACK.navigation.find(item => item.id === id)?.label || id, 18),
      icon: textValue(row.icon, FALLBACK.navigation.find(item => item.id === id)?.icon || 'ellipse-outline', 60),
      target: row.target === 'shopify' ? 'shopify' : 'native',
      path: pathValue(row.path),
      enabled: id === 'home' ? true : enabled(row),
      sortOrder: sortOrder(row, index * 10)
    };
  }, FALLBACK.navigation);
  for (const required of FALLBACK.navigation) {
    if (!navigation.some(item => item.id === required.id)) navigation.push(required);
  }

  const banners = safeRows<Banner>(root.banners, (row, index) => {
    const id = identifier(row.id);
    if (!id) return null;
    return {
      id,
      eyebrow: textValue(row.eyebrow, '', 80),
      title: textValue(row.title, 'Explore TiffinStash', 140),
      subtitle: textValue(row.subtitle, '', 260),
      ctaLabel: textValue(row.ctaLabel, 'Explore', 40),
      path: pathValue(row.path, '/collections/all'),
      imageAssetId: identifier(row.imageAssetId),
      imageUrl: safeImageUrl(textValue(row.imageUrl, '', 2048)) || undefined,
      backgroundColor: colorValue(row.backgroundColor, '#DE5200'),
      textColor: colorValue(row.textColor, '#FFFFFF'),
      enabled: enabled(row),
      sortOrder: sortOrder(row, index * 10)
    };
  }, FALLBACK.banners);

  const collections = safeRows<Collection>(root.collections, (row, index) => {
    const id = identifier(row.id);
    if (!id) return null;
    return {
      id,
      title: textValue(row.title, id, 80),
      subtitle: textValue(row.subtitle, '', 140),
      path: pathValue(row.path, '/collections/all'),
      imageAssetId: identifier(row.imageAssetId),
      imageUrl: safeImageUrl(textValue(row.imageUrl, '', 2048)) || undefined,
      enabled: enabled(row),
      sortOrder: sortOrder(row, index * 10)
    };
  }, FALLBACK.collections);

  const productRails = safeRows<ProductRail>(root.productRails, (row, index) => {
    const id = identifier(row.id);
    if (!id) return null;
    return {
      id,
      title: textValue(row.title, id, 100),
      subtitle: textValue(row.subtitle, '', 180),
      maxItems: numberValue(row.maxItems, 6, 1, 20),
      enabled: enabled(row),
      sortOrder: sortOrder(row, index * 10)
    };
  }, FALLBACK.productRails);

  const products = safeRows<Product>(root.products, (row, index) => {
    const id = identifier(row.id);
    if (!id) return null;
    const rawCities = Array.isArray(row.cities) ? row.cities : textValue(row.cities, 'All areas', 1000).split('|');
    const cities = rawCities.map(city => textValue(city, '', 60)).filter(Boolean).slice(0, 50);
    return {
      id,
      railId: identifier(row.railId) || 'best_sellers',
      title: textValue(row.title, id, 100),
      subtitle: textValue(row.subtitle, '', 180),
      badge: textValue(row.badge, '', 40),
      priceLabel: textValue(row.priceLabel, 'View plans', 40),
      path: pathValue(row.path, '/collections/all'),
      imageAssetId: identifier(row.imageAssetId),
      imageUrl: safeImageUrl(textValue(row.imageUrl, '', 2048)) || undefined,
      cuisine: textValue(row.cuisine, 'Indian', 60),
      diet: textValue(row.diet, 'Mixed', 30),
      cities: cities.length ? cities : ['All areas'],
      enabled: enabled(row),
      sortOrder: sortOrder(row, index * 10)
    };
  }, FALLBACK.products);

  const quickLinks = safeRows<QuickLink>(root.quickLinks, (row, index) => {
    const id = identifier(row.id);
    if (!id) return null;
    return {
      id,
      title: textValue(row.title, id, 80),
      subtitle: textValue(row.subtitle, '', 160),
      icon: textValue(row.icon, 'arrow-forward-outline', 60),
      path: pathValue(row.path, '/collections/all'),
      enabled: enabled(row),
      sortOrder: sortOrder(row, index * 10)
    };
  }, FALLBACK.quickLinks);

  const validSectionTypes = new Set(['banners', 'collections', 'product_rail', 'quick_links', 'message']);
  const homeSections = safeRows<HomeSection>(root.homeSections, (row, index) => {
    const id = identifier(row.id);
    const type = textValue(row.type, '', 40) as HomeSection['type'];
    if (!id || !validSectionTypes.has(type)) return null;
    return {
      id,
      type,
      title: textValue(row.title, '', 100),
      subtitle: textValue(row.subtitle, '', 180),
      referenceId: identifier(row.referenceId),
      enabled: enabled(row),
      sortOrder: sortOrder(row, index * 10)
    };
  }, FALLBACK.homeSections);

  const copyInput = record(root.copy);
  const copy = Object.entries({...FALLBACK.copy, ...copyInput}).slice(0, 500).reduce<Record<string, string>>((out, [key, value]) => {
    const id = identifier(key);
    if (id) out[id] = textValue(value, FALLBACK.copy[id] || '', 2000);
    return out;
  }, {});

  const contactActions = safeRows<ContactAction>(root.contactActions, (row, index) => {
    const id = identifier(row.id);
    if (!id || !['email', 'whatsapp'].includes(String(row.channel))) return null;
    return {
      id,
      title: textValue(row.title, id, 100),
      subtitle: textValue(row.subtitle, '', 180),
      channel: row.channel as ContactAction['channel'],
      recipient: textValue(row.recipient, '', 200),
      subject: textValue(row.subject, '', 200),
      body: textValue(row.body, '', 4000),
      enabled: enabled(row),
      sortOrder: sortOrder(row, index * 10)
    };
  }, FALLBACK.contactActions);

  const messages = safeRows<InAppMessage>(root.messages, (row, index) => {
    const id = identifier(row.id);
    if (!id) return null;
    const style = ['info', 'success', 'warning'].includes(String(row.style)) ? row.style as InAppMessage['style'] : 'info';
    return {
      id,
      title: textValue(row.title, '', 120),
      body: textValue(row.body, '', 300),
      style,
      ctaLabel: textValue(row.ctaLabel, '', 40),
      path: pathValue(row.path),
      startsAt: textValue(row.startsAt, '', 40),
      endsAt: textValue(row.endsAt, '', 40),
      enabled: enabled(row),
      sortOrder: sortOrder(row, index * 10)
    };
  }, FALLBACK.messages);

  const featureInput = record(root.featureFlags);
  const featureFlags = Object.entries({...FALLBACK.featureFlags, ...featureInput}).reduce<Record<string, boolean>>((out, [key, value]) => {
    const id = identifier(key);
    if (id) out[id] = booleanValue(value, FALLBACK.featureFlags[id] ?? false);
    return out;
  }, {});
  const rawCities = Array.isArray(root.cities) ? root.cities : FALLBACK.cities;
  const cities = [...new Set(rawCities.map(city => textValue(city, '', 60)).filter(Boolean))].slice(0, 100);
  if (!cities.includes('All areas')) cities.unshift('All areas');

  return {
    meta: {
      schemaVersion: FALLBACK.meta.schemaVersion,
      contentVersion: textValue(meta.contentVersion, FALLBACK.meta.contentVersion, 80),
      publishedAt: textValue(meta.publishedAt, FALLBACK.meta.publishedAt, 60)
    },
    settings: {
      storeName: textValue(settings.storeName, FALLBACK.settings.storeName, 80),
      announcementEnabled: booleanValue(settings.announcementEnabled, FALLBACK.settings.announcementEnabled),
      announcementText: textValue(settings.announcementText, FALLBACK.settings.announcementText, 180),
      supportEmail: textValue(settings.supportEmail, FALLBACK.settings.supportEmail, 200),
      whatsappNumber: textValue(settings.whatsappNumber, FALLBACK.settings.whatsappNumber, 20).replace(/\D/g, ''),
      defaultCity: textValue(settings.defaultCity, FALLBACK.settings.defaultCity, 60),
      currency: textValue(settings.currency, FALLBACK.settings.currency, 10),
      cacheMinutes: numberValue(settings.cacheMinutes, FALLBACK.settings.cacheMinutes, 1, 30),
      maintenanceMode: booleanValue(settings.maintenanceMode, FALLBACK.settings.maintenanceMode),
      maintenanceTitle: textValue(settings.maintenanceTitle, FALLBACK.settings.maintenanceTitle, 120),
      maintenanceBody: textValue(settings.maintenanceBody, FALLBACK.settings.maintenanceBody, 300),
      maintenanceCtaLabel: textValue(settings.maintenanceCtaLabel, FALLBACK.settings.maintenanceCtaLabel, 60)
    },
    assets: Object.keys(assets).length ? assets : FALLBACK.assets,
    navigation: sortEnabled(navigation),
    banners: sortEnabled(banners),
    collections: sortEnabled(collections),
    productRails: sortEnabled(productRails),
    products: sortEnabled(products),
    quickLinks: sortEnabled(quickLinks),
    homeSections: sortEnabled(homeSections),
    copy,
    contactActions: sortEnabled(contactActions),
    featureFlags,
    messages: sortEnabled(messages),
    cities: cities.length ? cities : FALLBACK.cities
  };
}

async function fetchRemoteConfig(): Promise<AppConfig> {
  if (!/^https:\/\//i.test(CONFIG_URL)) throw new Error('Remote content URL is not configured.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(CONFIG_URL, {headers: {Accept: 'application/json'}, signal: controller.signal});
    if (!response.ok) throw new Error(`Spreadsheet returned ${response.status}.`);
    const payload = await response.text();
    if (payload.length > MAX_RESPONSE_BYTES) throw new Error('Spreadsheet response is too large.');
    return normalizeConfig(JSON.parse(payload));
  } finally {
    clearTimeout(timer);
  }
}

export function ContentProvider({children}: {children: React.ReactNode}) {
  const [config, setConfig] = useState<AppConfig>(FALLBACK);
  const [source, setSource] = useState<ContentState['source']>('bundled');
  const [refreshing, setRefreshing] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!CONFIG_URL) return;
    setRefreshing(true);
    try {
      const next = await fetchRemoteConfig();
      if (!mounted.current) return;
      setConfig(next);
      setSource('remote');
      setWarning(null);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({savedAt: Date.now(), config: next}));
    } catch {
      if (mounted.current) setWarning('offline');
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    AsyncStorage.getItem(CACHE_KEY)
      .then(raw => {
        if (!raw || !mounted.current) return;
        const cached = record(JSON.parse(raw));
        const next = normalizeConfig(cached.config);
        setConfig(next);
        setSource('cache');
      })
      .catch(() => {})
      .finally(refresh);
    return () => { mounted.current = false; };
  }, [refresh]);

  const value = useMemo<ContentState>(() => ({config, source, refreshing, warning, refresh}), [config, source, refreshing, warning, refresh]);
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const value = useContext(ContentContext);
  if (!value) throw new Error('useContent must be used inside ContentProvider.');
  return value;
}

export function imageUrl(config: AppConfig, assetId: string, override?: string) {
  return safeImageUrl(override || '') || config.assets[assetId]?.url || '';
}

export function copyValue(config: AppConfig, key: string, fallback = '') {
  return config.copy[key] || fallback;
}

export {FALLBACK, normalizeConfig};
