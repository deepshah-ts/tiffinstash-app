# Validation report

Validation date: 12 September 2026

## Completed

| Check | Result |
| --- | --- |
| TypeScript compile check | Passed |
| Node unit tests | 12/12 passed |
| Expo dependency/configuration audit | 21/21 checks passed |
| Expo web production export | Passed |
| iOS JavaScript/asset export | Passed |
| Android JavaScript/asset export | Passed |
| Control workbook generation | 16 sheets, 14 native tables |
| Workbook formula scan | 0 formula errors |
| Workbook visual review | All 16 populated sheets rendered and reviewed |
| Native Google Sheets conversion | Passed |
| Native Sheets table typing | Dropdown, boolean, number and date/time columns verified |
| Sheet dashboard | READY, 129 live rows, 0 drafts, 0 rows to fix |

Unit coverage includes store/image URL allowlisting, preference normalization, browse filtering, ordering, scheduled-message windows, reminder inputs, contact links, notification routes and production release guards.

## Still required before release

- Signed EAS preview and production builds using company credentials.
- Full visual QA on physical iPhone and Android devices; browser-only rendering is not a substitute.
- Update-in-place testing over the current production apps.
- Real-device Shopify login, Globo options, Recurpay, cart and merchant-approved payment acceptance tests.
- Accessibility, notification, poor-network, app-backgrounding and process-restart tests.
- App Store Connect/Play Console version-code, policy, privacy and listing review.

Run the local validation suite with:

```sh
npm run validate
npm run release:check
```

`release:check` is expected to block until the production environment fields are deliberately supplied. It cannot verify console ownership, certificate fingerprints or store approval.
