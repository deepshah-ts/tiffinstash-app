'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const brand = require('../data/brand.json');

test('app matches the current Shopify theme palette and typography', () => {
  assert.equal(brand.font.family, 'Poppins');
  assert.equal(brand.palette.orange, '#DE5200');
  assert.equal(brand.palette.charcoal, '#3F414A');
  assert.equal(brand.palette.black, '#0D0E15');
  assert.equal(brand.palette.yellow, '#FEDC18');
  assert.match(read('src/components/BrandFonts.tsx'), /Poppins_700Bold/);
});

test('every app-owned screen is inside the brand-font and content providers', () => {
  const app = read('App.tsx');
  assert.match(app, /<BrandFonts><ContentProvider><AppContent\/><\/ContentProvider><\/BrandFonts>/);
  assert.doesNotMatch(app, /from ['"]react-native['"][^;]*\bText\b/);
  assert.match(read('src/components/NativeUI.tsx'), /from ['"]\.\/Typography['"]/);
  assert.match(read('src/components/ShopBrowser.native.tsx'), /from ['"]\.\/Typography['"]/);
});

test('the recovered green prototype styling and invented monogram are absent', () => {
  const source = [read('App.tsx'), read('src/components/NativeUI.tsx'), read('data/brand.json')].join('\n');
  assert.doesNotMatch(source, /#4[0-9A-F]{5}\b/i);
  assert.doesNotMatch(source, />TS</);
  assert.match(read('app.config.js'), /assets\/icon\.png/);
});
