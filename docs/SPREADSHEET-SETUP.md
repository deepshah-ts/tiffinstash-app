# Spreadsheet setup and publishing

The [TiffinStash Mobile App Control](https://docs.google.com/spreadsheets/d/1JlwEy-d50j9wXaw_q0TYmX2fzpOhARNB7acZhisnbVc/edit) Sheet is the app's public content console. Its Dashboard currently reports 129 live rows, 0 drafts and 0 rows to fix.

## What each tab controls

| Tab | Controls |
| --- | --- |
| Dashboard | Live/draft/error totals and the public-data safety boundary |
| README | Editor workflow inside the workbook |
| Settings | Announcement, support contacts, default city, cache and maintenance mode |
| Assets | Central image URL and alt-text library |
| Navigation | Bottom-tab labels, icons, order and visibility |
| Banners | Hero copy, colours, links, images, order and visibility |
| Collections | Cuisine cards, descriptions, links and images |
| Product_Rails | Rail headings and maximum card counts |
| Products | Featured cards, badges, browse metadata, destinations and images |
| Quick_Links | Shortcut cards on Home |
| Home_Sections | Home layout, section type, order and visibility |
| App_Copy | All app-owned screen wording |
| Contact_Actions | Prewritten support email and WhatsApp recipients, subjects and bodies |
| Feature_Flags | Favourites, city picker, reminders, messages, refresh and announcement bar |
| Messages | Date-bounded in-app notice cards |
| Cities | Browse-area choices and ordering |

This controls in-app contact templates. It does not create or send Shopify Email marketing campaigns.

## Change an image

1. Upload the owned image in Shopify Admin under **Content → Files**.
2. Copy its HTTPS Shopify CDN URL.
3. To update every place using an image, replace the URL on its `Assets` row.
4. To update only one banner, collection or product card, paste the URL into that row's `image_url_override` cell.
5. Write meaningful alt text, keep the row `LIVE`, and confirm `row_check` says `READY`.
6. Test the changed card on both iPhone and Android before a public promotion.

The app accepts only clean HTTPS image URLs. Broken images fall back to a branded placeholder.

## Edit and publish content

1. Make the row `DRAFT` while editing.
2. Use a stable, unique lowercase `id` or `asset_id`. Do not rename an ID already referenced elsewhere unless every reference is updated.
3. Use a TiffinStash path such as `/collections/tiffins` or a full `https://tiffinstash.com/...` URL. Admin and OAuth paths are blocked.
4. Set `enabled` to `TRUE`, choose the order number, and fix the row until `row_check` is `READY`.
5. Set `status` to `LIVE`.
6. Increase `Settings → content_version` for a coordinated release.
7. Use **TiffinStash App → Clear app content cache**, then pull to refresh in a preview build.

The publisher emits only rows that are both `LIVE` and `READY`. `DRAFT`, incomplete and disabled content cannot appear in the app. The endpoint caches published JSON for 1–30 minutes; editing the Sheet and the menu command clear that cache.

## One-time Apps Script deployment

Google Drive conversion does not attach scripts automatically, so complete these steps once:

1. Open the control Sheet and choose **Extensions → Apps Script**.
2. Replace the editor contents with `apps-script/Code.gs` from this project.
3. In Apps Script Project Settings, enable the manifest file in the editor. Replace `appsscript.json` with the supplied `apps-script/appsscript.json`.
4. Save. Run `validateWorkbook` once and grant the requested spreadsheet permission.
5. Choose **Deploy → New deployment → Web app**.
6. Set **Execute as** to yourself and **Who has access** to **Anyone**. Deploy.
7. Test the returned URL with `?health=1`. It should return JSON with `"ok":true` and schema version 1.
8. Put the exact HTTPS `/exec` URL in `EXPO_PUBLIC_CONFIG_URL` locally and in the company-owned EAS build environment.

The endpoint is intentionally public and read-only. Never put passwords, API keys, signing material, private drafts, customer information, order details or subscription records in this workbook.

## Failure and rollback behaviour

- If the remote endpoint is missing or fails, the app starts with the last good cached configuration.
- If no cache exists, it uses `data/default-config.json`, which mirrors the supplied launch content.
- Malformed, oversized or unsafe remote values are rejected or replaced with safe fallback values.
- To roll back content, restore the previous row values, return them to `LIVE`, increase `content_version`, clear the content cache and test again.

Spreadsheet changes cannot alter Shopify product rules, prices, availability, taxes, delivery logic, add-ons, subscription state, cart or checkout. Those stay on Shopify by design.
