# Changelog

All notable changes to the **TCG Placeholder Generator** project will be documented in this file.

---

## 🎉 [1.2.0] - December 28, 2025

### ✨ New Features

#### Sharing & Collaboration

- **Shareable Custom Sets** — Share your custom sets via QR code or link! Recipients can import a set to their own collection. Powered by Supabase.

#### User Experience

- **Splash Screen** — Animated Pokéball loading screen on app startup.
- **Bulk Card Selection & Delete** — Select multiple cards and delete them at once with a new floating action bar.

#### Print & Export

- **Persistent Print Settings** — Advanced settings (watermark, visibility, opacity, page size, orientation) saved to local storage.
- **Redesigned Settings Modal** — Cleaner layout with improved visual grouping.
- **Granular Text Control** — Separate toggles for Rarity Badge and Set Information on printed cards.

#### Card Variants

- **No-Variant Filters** — Basic Energy and Ace Spec cards skip the variant picker automatically.
- **Special Card Logic** — GX, V, VMAX, VSTAR, and EX cards skip variant picker (already holographic).
- **Robust Variant Selection** — Accurate handling of Reverse Holo, Pokeball Holo, and Masterball Holo variants.

#### Data & API

- **Improved Set Headers** — Release year now displayed in set headers.
- **Older Sets Support** — Seamlessly add older sets and cards to custom collections.
- **Set Data Merging** — Preserves release dates and series info when fetching card details.

---

### 🔄 Changed

- **Share Spam Protection** — Reuses existing share links for identical content to prevent database abuse.
- **Real-time Card Count Sync** — Card counts update immediately when navigating back after deleting cards.
- **Modal Layout** — Wider Advanced Settings modal for a more spacious feel.
- **Variant Logic** — Removed outdated pre-2002 variant disclaimers.
- **GraphQL Queries** — Optimized to fetch only necessary fields.

---

### 🐛 Fixed

- **Import Card Count** — Imported sets now show correct card count on homepage.
- **TCGDex API Stability** — Fixed crashes from GraphQL resolver errors.
- **Missing Older Cards** — Fixed missing older cards and sets.
- **"Unknown" Series Bug** — Sets no longer display "Unknown" as series.

---

### ⚠️ Known Issues

- **API Limitations** — Some nested queries require external merge strategy.
- **Missing Set Assets** — Some promo sets may lack high-res logos.
- **Large PDFs** — High-resolution captures result in larger file sizes.

---

## 🚀 Planned Features

- **Bulk Add to Custom Sets** — Add multiple cards with one click.
- **Print Template Presets** — Save and switch between print profiles.
- **Custom Margins & Scale** — Fine-grained PDF layout control.
- **Watermark Customization** — Upload custom SVG or image watermarks.
- **Advanced Search Filters** — Filter by variant availability.
