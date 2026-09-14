# TiffinStash Mobile 5.0


TiffinStash Mobile is an Expo React Native app for iPhone and Android. It gives the current Shopify store a polished mobile shell while keeping ordering, subscriptions, delivery choices, paid add-ons, cart, login and checkout inside Shopify.

The app-owned experience is controlled by the [TiffinStash Mobile App Control](https://docs.google.com/spreadsheets/d/1JlwEy-d50j9wXaw_q0TYmX2fzpOhARNB7acZhisnbVc/edit) Google Sheet. Banner and collection images, featured products, navigation, home-section order, copy, contact-email templates, WhatsApp templates, cities, feature flags, announcements and maintenance mode can change without an app-store release.

## What is included

- Brand-matched Home, Browse, My Plan, Orders and Account screens using the live theme's Poppins typography, orange palette, logo and current imagery.
- A persistent in-app Shopify browser so cart, customer login and checkout cookies stay together.
- Search, diet and city filters for spreadsheet-curated cards.
- Device-local favourites, city preference and optional weekday reminders.
- Cached last-good spreadsheet content plus a bundled launch fallback.
- Secure URL validation, HTTPS-only remote images and no Shopify DOM injection or credential bridge.
- A bound Google Apps Script publisher that turns approved Sheet rows into the app's JSON configuration.
- Guarded Expo/EAS configuration for preview builds and updates to the existing store listings.

This repository is a release candidate, not a signed `.ipa` or `.aab`. Apple/Google signing credentials, the company Expo project, the deployed Apps Script URL and physical-device acceptance testing are still required.

## Architecture

The native layer owns discovery and presentation. Shopify remains the source of truth for anything transactional.

| Native and spreadsheet-controlled | Shopify-controlled |
| --- | --- |
| Banners, collections and featured-card imagery | Product variants and current availability |
| Home-section order, labels and promotional copy | Globo options, delivery fields and add-ons |
| Browse filters, favourites and city preference | Recurpay plans and subscription lifecycle |
| In-app messages, feature flags and maintenance screen | Customer account, cart, taxes and checkout |
| Prewritten support email/WhatsApp handoffs | Payment methods, redirects and order creation |

See `docs/ARCHITECTURE.md` and `docs/THEME-MAPPING.md` for the exact boundary.

## First run

Use Node.js 20.19 or newer:

```sh
npm ci
cp .env.example .env
npm run validate
npm start
```

`npm run preview` starts the same app in Expo's web target. It is useful for layout review, but Shopify opens in a normal browser on web; the persistent embedded browser is native-only.

Before testing live spreadsheet updates, deploy `apps-script/Code.gs` from the supplied Google Sheet and put its HTTPS `/exec` URL in `EXPO_PUBLIC_CONFIG_URL`. The full setup is in `docs/SPREADSHEET-SETUP.md`.

## Build identities

| Build | iOS bundle identifier | Android package | Purpose |
| --- | --- | --- | --- |
| Preview | `com.tiffinstash.preview` | `com.tiffinstash.preview` | Installs beside the live app for internal testing |
| Production | `org.tiffinstash.app` | `com.tiffinstash` | Updates the existing App Store and Play Store records |

The existing iOS App Store ID is `6505018028`. Production configuration fails closed until the verified build numbers, company EAS project ID, spreadsheet endpoint and `RELEASE_IDENTITY_VERIFIED=YES` are supplied.

Private preview builds:

```sh
npx eas-cli@latest build:configure
npx eas-cli@latest build --profile preview --platform android
npx eas-cli@latest build --profile preview --platform ios
```

Do not submit the preview identifiers. Complete `docs/RELEASE-CHECKLIST.md` before running a production build or submission.

## Key files

- `App.tsx` — five-screen native shell, preferences, messages and Shopify handoffs.
- `src/services/content.tsx` — remote config validation, cache and bundled fallback.
- `src/components/ShopBrowser.native.tsx` — persistent native Shopify browser.
- `data/default-config.json` — safe launch content if the Sheet is unavailable.
- `spreadsheet/TiffinStash-App-Control.xlsx` — portable backup of the control workbook.
- `apps-script/Code.gs` — public read-only content publisher for the Sheet.
- `app.config.js` and `eas.json` — preview/production identities and build profiles.
- `docs/TEST-REPORT.md` — completed checks and remaining device tests.

No Shopify theme, product, customer, order, subscription, payment, live app listing or signing credential was changed while creating this project.
