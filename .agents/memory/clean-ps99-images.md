---
name: Clean PS99 item images
description: PS99 item images must use the clean catalog-backed renderer rather than values-site image URLs
---

Use the clean BigGames catalog-backed image renderer for PS99 items. Legacy values-site URLs contain a repeated Cosmic Values watermark and should be treated as compatibility inputs that resolve to the clean renderer, not as assets to store or serve.

**Why:** The values-site PNGs visibly embed third-party branding, and manually editing thousands of item images is impractical.

**How to apply:** Keep scraped item records pointed at the shared clean image endpoint; derive Shiny, Golden, and Rainbow presentation from the item name so one base image supports all variants.