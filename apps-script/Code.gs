/**
 * TiffinStash Mobile Content API
 *
 * Bind this script to the supplied Google Sheet, deploy it as a Web app, and
 * paste the /exec URL into EXPO_PUBLIC_CONFIG_URL. The app treats this endpoint
 * as public, read-only content: never put secrets, customer data, tokens, order
 * details, or private drafts in a LIVE row.
 */

const SCHEMA_VERSION = 1;
const DEFAULT_CACHE_SECONDS = 300;
const REQUIRED_SHEETS = [
  'Settings', 'Assets', 'Navigation', 'Banners', 'Collections',
  'Product_Rails', 'Products', 'Quick_Links', 'Home_Sections',
  'App_Copy', 'Contact_Actions', 'Feature_Flags', 'Messages', 'Cities'
];

function doGet(event) {
  try {
    if (event && event.parameter && event.parameter.health === '1') {
      return json_({ok: true, service: 'TiffinStash Mobile Content API', schemaVersion: SCHEMA_VERSION});
    }
    const cache = CacheService.getScriptCache();
    const cacheKey = 'tiffinstash-mobile-config-v1';
    const cached = cache.get(cacheKey);
    if (cached) return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
    const config = buildConfig_();
    const payload = JSON.stringify(config);
    const ttl = Math.min(1800, Math.max(30, Number(config.settings.cacheMinutes || 5) * 60));
    cache.put(cacheKey, payload, ttl);
    return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return json_({ok: false, error: String(error && error.message || error), schemaVersion: SCHEMA_VERSION});
  }
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('TiffinStash App')
    .addItem('Validate control sheet', 'validateWorkbook')
    .addItem('Clear app content cache', 'clearContentCache')
    .addToUi();
}

function onEdit() {
  clearContentCache();
}

function clearContentCache() {
  CacheService.getScriptCache().remove('tiffinstash-mobile-config-v1');
}

function validateWorkbook() {
  const spreadsheet = spreadsheet_();
  const missing = REQUIRED_SHEETS.filter(name => !spreadsheet.getSheetByName(name));
  const message = missing.length ? 'Missing tabs: ' + missing.join(', ') : 'Control sheet structure is ready.';
  try { SpreadsheetApp.getActive().toast(message, 'TiffinStash App', 8); } catch (_) {}
  if (missing.length) throw new Error(message);
  return message;
}

function buildConfig_() {
  validateWorkbook();
  const settings = settings_();
  const schemaVersion = number_(settings.schema_version, SCHEMA_VERSION, 1, 99);
  if (schemaVersion !== SCHEMA_VERSION) throw new Error('Unsupported schema_version ' + schemaVersion + '. Expected ' + SCHEMA_VERSION + '.');

  const assets = {};
  liveRows_('Assets').forEach(row => {
    const id = id_(row.asset_id);
    const url = imageUrl_(row.url);
    if (id && url) assets[id] = {url: url, altText: string_(row.alt_text, id, 180)};
  });

  const navigation = liveRows_('Navigation').map((row, index) => ({
    id: id_(row.id),
    label: string_(row.label, '', 18),
    icon: string_(row.icon, 'ellipse-outline', 60),
    target: String(row.target).toLowerCase() === 'shopify' ? 'shopify' : 'native',
    path: path_(row.path),
    enabled: bool_(row.enabled, true),
    sortOrder: number_(row.sort_order, index * 10, -10000, 10000)
  })).filter(row => row.id);

  const banners = liveRows_('Banners').map((row, index) => ({
    id: id_(row.id),
    eyebrow: string_(row.eyebrow, '', 80),
    title: string_(row.title, '', 140),
    subtitle: string_(row.subtitle, '', 260),
    ctaLabel: string_(row.cta_label, 'Explore', 40),
    path: path_(row.path),
    imageAssetId: id_(row.image_asset_id),
    imageUrl: imageUrl_(row.image_url_override),
    backgroundColor: color_(row.background_color, '#DE5200'),
    textColor: color_(row.text_color, '#FFFFFF'),
    enabled: bool_(row.enabled, true),
    sortOrder: number_(row.sort_order, index * 10, -10000, 10000)
  })).filter(row => row.id && row.title && row.path);

  const collections = liveRows_('Collections').map((row, index) => ({
    id: id_(row.id),
    title: string_(row.title, '', 80),
    subtitle: string_(row.subtitle, '', 140),
    path: path_(row.path),
    imageAssetId: id_(row.image_asset_id),
    imageUrl: imageUrl_(row.image_url_override),
    enabled: bool_(row.enabled, true),
    sortOrder: number_(row.sort_order, index * 10, -10000, 10000)
  })).filter(row => row.id && row.title && row.path);

  const productRails = liveRows_('Product_Rails').map((row, index) => ({
    id: id_(row.id),
    title: string_(row.title, '', 100),
    subtitle: string_(row.subtitle, '', 180),
    maxItems: number_(row.max_items, 6, 1, 20),
    enabled: bool_(row.enabled, true),
    sortOrder: number_(row.sort_order, index * 10, -10000, 10000)
  })).filter(row => row.id && row.title);

  const products = liveRows_('Products').map((row, index) => ({
    id: id_(row.id),
    railId: id_(row.rail_id),
    title: string_(row.title, '', 100),
    subtitle: string_(row.subtitle, '', 180),
    badge: string_(row.badge, '', 40),
    priceLabel: string_(row.price_label, 'View plans', 40),
    path: path_(row.path),
    imageAssetId: id_(row.image_asset_id),
    imageUrl: imageUrl_(row.image_url_override),
    cuisine: string_(row.cuisine, 'Indian', 60),
    diet: string_(row.diet, 'Mixed', 30),
    cities: String(row.cities || 'All areas').split('|').map(value => string_(value, '', 60)).filter(Boolean).slice(0, 50),
    enabled: bool_(row.enabled, true),
    sortOrder: number_(row.sort_order, index * 10, -10000, 10000)
  })).filter(row => row.id && row.railId && row.title && row.path);

  const quickLinks = liveRows_('Quick_Links').map((row, index) => ({
    id: id_(row.id),
    title: string_(row.title, '', 80),
    subtitle: string_(row.subtitle, '', 160),
    icon: string_(row.icon, 'arrow-forward-outline', 60),
    path: path_(row.path),
    enabled: bool_(row.enabled, true),
    sortOrder: number_(row.sort_order, index * 10, -10000, 10000)
  })).filter(row => row.id && row.title && row.path);

  const homeSections = liveRows_('Home_Sections').map((row, index) => ({
    id: id_(row.id),
    type: string_(row.type, '', 40),
    title: string_(row.title, '', 100),
    subtitle: string_(row.subtitle, '', 180),
    referenceId: id_(row.reference_id),
    enabled: bool_(row.enabled, true),
    sortOrder: number_(row.sort_order, index * 10, -10000, 10000)
  })).filter(row => row.id && ['banners', 'collections', 'product_rail', 'quick_links', 'message'].indexOf(row.type) >= 0);

  const copy = {};
  liveRows_('App_Copy').forEach(row => {
    const key = id_(row.key);
    if (key) copy[key] = string_(row.value, '', 2000);
  });

  const contactActions = liveRows_('Contact_Actions').map((row, index) => ({
    id: id_(row.id),
    title: string_(row.title, '', 100),
    subtitle: string_(row.subtitle, '', 180),
    channel: String(row.channel).toLowerCase(),
    recipient: string_(row.recipient, '', 200),
    subject: string_(row.subject, '', 200),
    body: string_(row.body, '', 4000),
    enabled: bool_(row.enabled, true),
    sortOrder: number_(row.sort_order, index * 10, -10000, 10000)
  })).filter(row => row.id && ['email', 'whatsapp'].indexOf(row.channel) >= 0);

  const featureFlags = {};
  liveRows_('Feature_Flags').forEach(row => {
    const key = id_(row.key);
    if (key) featureFlags[key] = bool_(row.enabled, false);
  });

  const messages = liveRows_('Messages').map((row, index) => ({
    id: id_(row.id),
    title: string_(row.title, '', 120),
    body: string_(row.body, '', 300),
    style: ['info', 'success', 'warning'].indexOf(String(row.style).toLowerCase()) >= 0 ? String(row.style).toLowerCase() : 'info',
    ctaLabel: string_(row.cta_label, '', 40),
    path: path_(row.path),
    startsAt: iso_(row.starts_at),
    endsAt: iso_(row.ends_at),
    enabled: bool_(row.enabled, true),
    sortOrder: number_(row.sort_order, index * 10, -10000, 10000)
  })).filter(row => row.id && row.title);

  const cities = liveRows_('Cities').filter(row => bool_(row.enabled, true)).sort((a, b) => number_(a.sort_order, 0, -10000, 10000) - number_(b.sort_order, 0, -10000, 10000)).map(row => string_(row.city, '', 60)).filter(Boolean);

  return {
    meta: {
      schemaVersion: schemaVersion,
      contentVersion: string_(settings.content_version, '1', 80),
      publishedAt: new Date().toISOString()
    },
    settings: {
      storeName: string_(settings.store_name, 'TiffinStash', 80),
      announcementEnabled: bool_(settings.announcement_enabled, true),
      announcementText: string_(settings.announcement_text, '', 180),
      supportEmail: string_(settings.support_email, 'info@tiffinstash.com', 200),
      whatsappNumber: String(settings.whatsapp_number || '').replace(/\D/g, '').slice(0, 15),
      defaultCity: string_(settings.default_city, 'All areas', 60),
      currency: string_(settings.currency, 'CAD', 10),
      cacheMinutes: number_(settings.cache_minutes, 5, 1, 30),
      maintenanceMode: bool_(settings.maintenance_mode, false),
      maintenanceTitle: string_(settings.maintenance_title, 'We’ll be right back', 120),
      maintenanceBody: string_(settings.maintenance_body, '', 300),
      maintenanceCtaLabel: string_(settings.maintenance_cta_label, 'Open tiffinstash.com', 60)
    },
    assets: assets,
    navigation: navigation,
    banners: banners,
    collections: collections,
    productRails: productRails,
    products: products,
    quickLinks: quickLinks,
    homeSections: homeSections,
    copy: copy,
    contactActions: contactActions,
    featureFlags: featureFlags,
    messages: messages,
    cities: cities
  };
}

function spreadsheet_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Bind this script to the TiffinStash control sheet or set the SPREADSHEET_ID script property.');
  return SpreadsheetApp.openById(id);
}

function rows_(sheetName) {
  const sheet = spreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new Error('Missing required tab: ' + sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(value => String(value).trim().toLowerCase());
  return values.slice(1).map(row => headers.reduce((object, header, index) => {
    if (header) object[header] = row[index];
    return object;
  }, {})).filter(row => Object.keys(row).some(key => String(row[key]).trim() !== ''));
}

function liveRows_(sheetName) {
  return rows_(sheetName).filter(row =>
    String(row.status || '').trim().toUpperCase() === 'LIVE' &&
    String(row.row_check || '').trim().toUpperCase() === 'READY'
  );
}

function settings_() {
  const out = {};
  liveRows_('Settings').forEach(row => {
    const key = String(row.key || '').trim().toLowerCase();
    if (!key) return;
    const type = String(row.value_type || 'text').trim().toLowerCase();
    out[key] = type === 'boolean' ? bool_(row.value, false) : type === 'number' ? Number(row.value) : row.value;
  });
  return out;
}

function id_(value) {
  const text = String(value || '').trim().slice(0, 64);
  return /^[a-z0-9][a-z0-9_-]*$/i.test(text) ? text : '';
}

function string_(value, fallback, maxLength) {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return (text || fallback).slice(0, maxLength);
}

function bool_(value, fallback) {
  if (typeof value === 'boolean') return value;
  const text = String(value || '').trim().toLowerCase();
  if (['true', 'yes', '1', 'on'].indexOf(text) >= 0) return true;
  if (['false', 'no', '0', 'off'].indexOf(text) >= 0) return false;
  return fallback;
}

function number_(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function path_(value) {
  const path = String(value || '').trim().slice(0, 2048);
  if (/^\/(?!\/)(?!admin(?:\/|$))(?!oauth(?:\/|$))/i.test(path)) return path;
  if (/^https:\/\/(?:www\.)?tiffinstash\.com(?:\/|$)/i.test(path)) return path;
  return '';
}

function imageUrl_(value) {
  const url = String(value || '').trim().slice(0, 2048);
  return /^https:\/\/[^\s]+$/i.test(url) ? url : '';
}

function color_(value, fallback) {
  const color = String(value || '').trim().toUpperCase();
  return /^#[0-9A-F]{6}(?:[0-9A-F]{2})?$/.test(color) ? color : fallback;
}

function iso_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString();
  const text = String(value || '').trim();
  const parsed = new Date(text);
  return text && !isNaN(parsed.getTime()) ? parsed.toISOString() : '';
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
