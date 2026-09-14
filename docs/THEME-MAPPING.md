# Live-theme mapping

The app styling and launch content were rebuilt against `theme_export__tiffinstash-com-live-theme-20-12-24__12SEP2026-0340am.zip`, supplied on 12 September 2026.

## Visual system

| Theme signal | Mobile implementation |
| --- | --- |
| Poppins | Bundled through `@expo-google-fonts/poppins` in weights 400–800 |
| Primary orange `#DE5200` | Calls to action, active navigation, labels and highlights |
| Charcoal `#3F414A` and black `#0D0E15` | Body copy and primary text |
| Accent orange `#FF9D2D` and yellow `#FEDC18` | Secondary accents only |
| White background | Main mobile surface with restrained neutral cards |
| Current logo files | App header and splash screen |
| Current theme/CDN images | Initial banners, cuisine collections and featured cards |

The production icon is the artwork from the existing App Store listing. No invented logo mark or generic green theme remains.

## Storefront logic retained

The theme contains LayoutHub homepage sections plus Recurpay and Globo Product Options integrations. Product forms include conditional delivery choices, start dates, add-ons, extras and validation. Reimplementing that logic in a separate native cart would risk dropped line-item properties and inconsistent totals.

For that reason, curated native cards hand off to the corresponding current Shopify route. Product configuration, cart and checkout continue through the live site inside one persistent browser session.

## Control-sheet mapping

- A theme image can be replaced centrally in `Assets` or once with `image_url_override`.
- `Banners`, `Collections`, `Products` and `Quick_Links` control content and destinations.
- `Home_Sections` changes the native homepage order without code.
- `App_Copy` controls app-owned wording; it does not alter Shopify theme copy.
- `Feature_Flags` hides or shows optional native features.

No files in the live Shopify theme were edited or uploaded during this build.
