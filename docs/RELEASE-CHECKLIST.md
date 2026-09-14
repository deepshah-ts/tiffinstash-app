# Existing-app release checklist

This release must update the existing apps. Do not create a second public listing.

## Verified public identity snapshot

| Platform | Existing identity | Public version seen 12 Sep 2026 | Candidate |
| --- | --- | --- | --- |
| iOS | Bundle `org.tiffinstash.app`, App Store ID `6505018028` | 4.2 | 5.0.0 |
| Android | Package `com.tiffinstash` | 4.4 | 5.0.0 |

Recheck the developer consoles immediately before building. Public listing metadata does not prove access, signing ownership or the highest build number on every test track.

## 1. Access, signing and migration

- Confirm company-controlled App Store Connect, Apple Developer, Play Console and Expo/EAS access.
- Confirm the Apple team, distribution certificate, provisioning profile and exact bundle identifier.
- Inspect every Play track for the highest version code. Confirm Play App Signing and the correct upload key/certificate.
- Record any existing Associated Domains, URL schemes, Sign in with Apple, Apple Pay, push, keychain or Android intent configuration that must survive the update.
- Confirm where the existing apps store sessions, favourites, plans, credits and notification registrations. Keeping the listing does not migrate third-party data automatically.
- Test an update installed over the latest production app, including login/session behaviour and local-data migration.
- Review the installed-device OS distribution before accepting the minimum OS produced by the selected Expo SDK.

## 2. Configure the release

Deploy the content endpoint first. Store verified, non-secret release variables in the company EAS environment:

```text
APP_VERSION=5.0.0
IOS_BUILD_NUMBER=<new unused build number>
ANDROID_VERSION_CODE=<integer above every Play track>
EAS_PROJECT_ID=<company Expo project UUID>
EXPO_PUBLIC_CONFIG_URL=<deployed Apps Script /exec URL>
RELEASE_IDENTITY_VERIFIED=YES
```

Keep certificates, private keys, service-account JSON, keystore files and passwords out of the Sheet, repository and chat.

Run locally with the same non-secret values before production:

```sh
node --env-file=.env scripts/release-check.cjs
npm run validate
```

## 3. Shopify acceptance tests

Use merchant-approved test products/payment handling. Do not change the live store's payment mode casually.

- Open a normal tiffin, Taste Drive item and a product with Globo options.
- Test every supported Recurpay cadence and plan-management path.
- Confirm meal choices, delivery area, start date, extras, add-ons, notes and any required fee items survive into cart and order properties.
- Compare discounts, taxes, shipping and final totals with the website.
- Test products from different sellers and delivery dates in one cart.
- Test guest checkout, Shopify account login, logout and re-login.
- Exercise each enabled payment method, redirect/challenge, cancel, return, timeout and network-failure path.
- Verify that payment cancellation/retry cannot create a duplicate order or payment.
- Confirm cart/session continuity after changing native tabs, backgrounding, closing/reopening the browser and restarting the app.
- Test the system-browser fallback and the warning that its cart/session can differ.

## 4. Native device tests

- Build and install both preview apps on representative iPhone and Android devices.
- Test small and large screens, notches, safe areas, landscape lock and text scaling.
- Test screen readers, focus order, labels, contrast and 44-point touch targets.
- Test Android hardware back, iOS swipe-back inside Shopify, process termination and offline recovery.
- Test all five tabs, every Sheet-controlled link, image fallback, pull to refresh and last-good cache.
- Test notification permission allowed, denied and later revoked; verify weekday scheduling across time-zone and daylight-saving changes.
- Verify app links/deep links required by campaigns or account flows.
- Capture final store screenshots from signed or distribution-equivalent builds.

## 5. Store policy and privacy

- Re-audit App Privacy and Play Data Safety against the actual Shopify pages, cookies, analytics and included SDKs.
- Verify support, privacy-policy and account-deletion paths.
- Complete encryption, age-rating, accessibility, reviewer-access and payment-policy questions.
- Update release notes and screenshots while preserving the existing listing IDs.
- Use TestFlight and Play internal testing first, then staged rollout with monitoring and a forward-fix plan.

## 6. Build and submit

```sh
npx eas-cli@latest build --profile production --platform ios
npx eas-cli@latest build --profile production --platform android
npx eas-cli@latest submit --profile production --platform ios
npx eas-cli@latest submit --profile production --platform android
```

The Android submit profile targets the internal track. Promote only after acceptance testing. No build or submission is performed by this source package.
