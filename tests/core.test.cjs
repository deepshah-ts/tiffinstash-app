'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../lib/core.cjs');
const config = require('../data/default-config.json');

test('store links are HTTPS and restricted to the TiffinStash storefront', () => {
  assert.equal(core.safeStoreUrl('/collections/tiffins'), 'https://tiffinstash.com/collections/tiffins');
  assert.equal(core.safeStoreUrl('https://www.tiffinstash.com/cart'), 'https://www.tiffinstash.com/cart');
  for (const bad of ['http://tiffinstash.com', 'https://evil.example', '//evil.example', 'javascript:alert(1)', '/admin', '/oauth/start', 'https://user:pass@tiffinstash.com']) assert.equal(core.safeStoreUrl(bad), null);
  assert.equal(core.searchUrl('paneer & roti'), 'https://tiffinstash.com/search?type=product&q=paneer+%26+roti');
});

test('remote images accept clean HTTPS only', () => {
  assert.equal(core.safeImageUrl('https://cdn.shopify.com/image.png'), 'https://cdn.shopify.com/image.png');
  assert.equal(core.safeImageUrl('http://cdn.shopify.com/image.png'), null);
  assert.equal(core.safeImageUrl('data:image/png;base64,AAAA'), null);
  assert.equal(core.safeImageUrl('https://user:pass@example.com/a.png'), null);
});

test('preferences are bounded to current spreadsheet content', () => {
  const prefs = core.normalisePreferences({city: 'Toronto', favourites: ['one', 'bad', 'one'], reminderHour: 18, reminderMinute: 15, dismissedMessages: ['welcome', 3]}, ['one'], ['All areas', 'Toronto']);
  assert.deepEqual(prefs, {city: 'Toronto', favourites: ['one'], reminderHour: 18, reminderMinute: 15, dismissedMessages: ['welcome']});
  assert.equal(core.normalisePreferences({city: 'Atlantis'}, [], ['All areas']).city, 'All areas');
});

test('filters, ordering and campaign windows are deterministic', () => {
  const products = [
    {id: 'a', title: 'Paneer', subtitle: 'Home style', cuisine: 'Punjabi', diet: 'Veg', badge: '', cities: ['Toronto'], enabled: true, sortOrder: 20},
    {id: 'b', title: 'Thali', subtitle: 'Everyday', cuisine: 'Gujarati', diet: 'Mixed', badge: '', cities: ['All areas'], enabled: true, sortOrder: 10},
    {id: 'c', title: 'Hidden', subtitle: '', cuisine: '', diet: 'Veg', badge: '', cities: ['All areas'], enabled: false, sortOrder: 0}
  ];
  assert.deepEqual(core.filterProducts(products, {query: 'paneer', city: 'Toronto', diet: 'Veg'}).map(x => x.id), ['a']);
  assert.deepEqual(core.filterProducts(products, {city: 'Mississauga'}).map(x => x.id), ['b']);
  assert.deepEqual(core.sortEnabled(products).map(x => x.id), ['b', 'a']);
  const messages = [{id: 'now', enabled: true, sortOrder: 20, startsAt: '2026-01-01', endsAt: '2026-12-31'}, {id: 'later', enabled: true, sortOrder: 10, startsAt: '2027-01-01', endsAt: '2027-12-31'}];
  assert.deepEqual(core.activeMessages(messages, Date.parse('2026-09-12')).map(x => x.id), ['now']);
});

test('contact actions are encoded and never contain sheet-side executable content', () => {
  const settings = {whatsappNumber: '+1 (437) 937-3267', supportEmail: 'info@tiffinstash.com'};
  assert.equal(core.contactUrl({enabled: true, channel: 'email', recipient: '', subject: 'Plan & delivery', body: 'Order #123'}, settings), 'mailto:info@tiffinstash.com?subject=Plan%20%26%20delivery&body=Order%20%23123');
  assert.equal(core.contactUrl({enabled: true, channel: 'whatsapp', body: 'Need help'}, settings), 'https://wa.me/14379373267?text=Need%20help');
  assert.equal(core.contactUrl({enabled: false, channel: 'email'}, settings), null);
});

test('local reminders are generic and route to My Plan', () => {
  assert.deepEqual(core.parseTime('06:05'), {hour: 6, minute: 5});
  assert.equal(core.parseTime('25:00'), null);
  assert.equal(core.formatTime(6, 5), '06:05');
  const requests = core.reminderRequests(11, 30);
  assert.equal(requests.length, 5);
  assert.ok(requests.every(item => item.content.data.kind === 'local-meal-reminder' && !/delivery (?:is|status)|order is/i.test(item.content.body)));
  assert.equal(core.safeNotificationTab({tab: 'orders'}), 'orders');
  assert.equal(core.safeNotificationTab({tab: 'admin'}), 'plan');
});

test('default spreadsheet content has valid references and safe links', () => {
  assert.equal(config.meta.schemaVersion, 1);
  assert.ok(config.banners.length >= 3 && config.collections.length >= 8 && config.products.length >= 6);
  const assetIds = new Set(Object.keys(config.assets));
  for (const item of [...config.banners, ...config.collections, ...config.products]) {
    assert.ok(assetIds.has(item.imageAssetId), `missing asset ${item.imageAssetId}`);
    assert.ok(core.safeStoreUrl(item.path), `unsafe path ${item.path}`);
  }
  const railIds = new Set(config.productRails.map(item => item.id));
  assert.ok(config.products.every(item => railIds.has(item.railId)));
  const contactIds = new Set(config.contactActions.map(item => item.id));
  for (const section of config.homeSections.filter(item => item.type === 'message')) assert.ok(contactIds.has(section.referenceId));
  assert.ok(config.navigation.some(item => item.id === 'home' && item.enabled));
});

test('production identity is locked to the live app listings', () => {
  const previous = {...process.env};
  Object.assign(process.env, {APP_VARIANT: 'production', RELEASE_IDENTITY_VERIFIED: 'YES', IOS_BUILD_NUMBER: '100', ANDROID_VERSION_CODE: '100', EAS_PROJECT_ID: '11111111-1111-4111-8111-111111111111', EXPO_PUBLIC_CONFIG_URL: 'https://script.google.com/macros/s/test/exec'});
  delete require.cache[require.resolve('../app.config.js')];
  const built = require('../app.config.js')();
  assert.equal(built.ios.bundleIdentifier, 'org.tiffinstash.app');
  assert.equal(built.android.package, 'com.tiffinstash');
  assert.equal(built.extra.existingAppStoreId, '6505018028');
  assert.ok(built.android.blockedPermissions.includes('android.permission.ACCESS_FINE_LOCATION'));
  process.env = previous;
});

test('Apps Script exposes only LIVE rows and includes cache invalidation', () => {
  const source = fs.readFileSync(path.join(__dirname, '../apps-script/Code.gs'), 'utf8');
  assert.match(source, /status[^\n]+LIVE/);
  assert.match(source, /function onEdit/);
  assert.match(source, /CacheService/);
  assert.match(source, /never put secrets/i);
});
