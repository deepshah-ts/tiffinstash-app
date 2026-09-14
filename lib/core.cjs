'use strict';

const STORE_ORIGIN = 'https://tiffinstash.com';
const STORE_HOSTS = new Set(['tiffinstash.com', 'www.tiffinstash.com']);
const TAB_IDS = ['home', 'explore', 'plan', 'orders', 'account'];
const EXPECTED_IOS_BUNDLE_ID = 'org.tiffinstash.app';
const EXPECTED_ANDROID_PACKAGE = 'com.tiffinstash';
const DEFAULT_CITIES = ['All areas', 'Toronto', 'Scarborough', 'North York', 'Mississauga', 'Brampton'];

function safeStoreUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) return null;
  try {
    const url = new URL(value, STORE_ORIGIN);
    if (url.protocol !== 'https:' || !STORE_HOSTS.has(url.hostname.toLowerCase()) || url.username || url.password || (url.port && url.port !== '443')) return null;
    if (/^\/(admin|oauth)(\/|$)/i.test(url.pathname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

function safeImageUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null;
    return url.href;
  } catch {
    return null;
  }
}

function searchUrl(query) {
  const url = new URL('/search', STORE_ORIGIN);
  url.searchParams.set('type', 'product');
  url.searchParams.set('q', String(query || '').trim().slice(0, 120));
  return url.href;
}

function normalisePreferences(input, knownIds, cities = DEFAULT_CITIES) {
  const value = input && typeof input === 'object' ? input : {};
  const ids = new Set(Array.isArray(knownIds) ? knownIds : []);
  const allowedCities = Array.isArray(cities) && cities.length ? cities : DEFAULT_CITIES;
  return {
    city: allowedCities.includes(value.city) ? value.city : allowedCities[0],
    favourites: Array.isArray(value.favourites) ? [...new Set(value.favourites.filter(x => typeof x === 'string' && ids.has(x)))].slice(0, 200) : [],
    reminderHour: Number.isInteger(value.reminderHour) && value.reminderHour >= 0 && value.reminderHour <= 23 ? value.reminderHour : 11,
    reminderMinute: Number.isInteger(value.reminderMinute) && value.reminderMinute >= 0 && value.reminderMinute <= 59 ? value.reminderMinute : 30,
    dismissedMessages: Array.isArray(value.dismissedMessages) ? [...new Set(value.dismissedMessages.filter(x => typeof x === 'string'))].slice(0, 100) : []
  };
}

function filterProducts(products, opts = {}) {
  const q = String(opts.query || '').trim().toLowerCase();
  return products.filter(product => {
    const searchMatches = !q || [product.title, product.subtitle, product.cuisine, product.diet, product.badge].join(' ').toLowerCase().includes(q);
    const cityMatches = !opts.city || opts.city === 'All areas' || product.cities.includes('All areas') || product.cities.includes(opts.city);
    const dietMatches = !opts.diet || opts.diet === 'All' || product.diet === opts.diet;
    const savedMatches = !opts.savedOnly || (opts.favourites || []).includes(product.id);
    return product.enabled !== false && searchMatches && cityMatches && dietMatches && savedMatches;
  });
}

function sortEnabled(items) {
  return (Array.isArray(items) ? items : [])
    .filter(item => item && item.enabled !== false)
    .slice()
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
}

function activeMessages(messages, now = Date.now()) {
  return sortEnabled(messages).filter(message => {
    const starts = Date.parse(message.startsAt || '');
    const ends = Date.parse(message.endsAt || '');
    return (!Number.isFinite(starts) || starts <= now) && (!Number.isFinite(ends) || ends >= now);
  });
}

function parseTime(raw) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(raw).trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? {hour, minute} : null;
}

function formatTime(hour, minute) {
  return String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
}

function reminderRequests(hour, minute) {
  if (!parseTime(formatTime(hour, minute))) throw new Error('Invalid reminder time.');
  return [2, 3, 4, 5, 6].map(weekday => ({
    identifier: 'ts-meal-reminder-' + weekday,
    content: {
      title: 'A little meal check-in',
      body: 'Check your meal plans or browse something for the week. This is your personal reminder, not a delivery update.',
      data: {tab: 'plan', kind: 'local-meal-reminder'}
    },
    trigger: {weekday, hour, minute}
  }));
}

function safeNotificationTab(data) {
  return data && TAB_IDS.includes(data.tab) ? data.tab : 'plan';
}

function contactUrl(action, settings) {
  if (!action || action.enabled === false) return null;
  const body = String(action.body || '').slice(0, 4000);
  if (action.channel === 'whatsapp') {
    const number = String(settings && settings.whatsappNumber || '').replace(/\D/g, '');
    if (number.length < 8 || number.length > 15) return null;
    return 'https://wa.me/' + number + '?text=' + encodeURIComponent(body);
  }
  if (action.channel === 'email') {
    const recipient = String(action.recipient || settings && settings.supportEmail || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) return null;
    return 'mailto:' + recipient + '?subject=' + encodeURIComponent(String(action.subject || '').slice(0, 200)) + '&body=' + encodeURIComponent(body);
  }
  return null;
}

function releaseErrors(env) {
  const errors = [];
  if (env.RELEASE_IDENTITY_VERIFIED !== 'YES') errors.push('Confirm signing access and migration for App Store ID 6505018028 and package com.tiffinstash; then set RELEASE_IDENTITY_VERIFIED=YES.');
  if (!/^[1-9]\d*(\.\d+){0,2}$/.test(env.IOS_BUILD_NUMBER || '')) errors.push('Set a valid, unused IOS_BUILD_NUMBER.');
  if (!/^[1-9]\d*$/.test(env.ANDROID_VERSION_CODE || '') || Number(env.ANDROID_VERSION_CODE) > 2100000000) errors.push('Set ANDROID_VERSION_CODE above every Play Console track.');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(env.EAS_PROJECT_ID || '')) errors.push('Set the company-owned EAS_PROJECT_ID.');
  if (!env.EXPO_PUBLIC_CONFIG_URL || !/^https:\/\//i.test(env.EXPO_PUBLIC_CONFIG_URL)) errors.push('Set the deployed HTTPS Google Apps Script EXPO_PUBLIC_CONFIG_URL.');
  return errors;
}

module.exports = {
  STORE_ORIGIN,
  STORE_HOSTS,
  TAB_IDS,
  EXPECTED_IOS_BUNDLE_ID,
  EXPECTED_ANDROID_PACKAGE,
  DEFAULT_CITIES,
  safeStoreUrl,
  safeImageUrl,
  searchUrl,
  normalisePreferences,
  filterProducts,
  sortEnabled,
  activeMessages,
  parseTime,
  formatTime,
  reminderRequests,
  safeNotificationTab,
  contactUrl,
  releaseErrors
};
