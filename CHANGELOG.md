# Changelog

All notable changes to the **TCG Placeholder Generator** project will be documented in this file.

---

## 📦 [1.3.0] - December 31, 2025

### ✨ New Features

#### Bulk Actions

- **Bulk Add to Custom Sets** — Select multiple cards from any official or master set and add them to your custom sets simultaneously via a new dedicated modal.

---

### 🐛 Fixed

- **Manifest Integrity** — Resolved a syntax error in the web manifest file that could interfere with PWA installation.
- **Mobile UI** — Fixed inconsistent centering of the floating action bar on smaller devices.
- **Set Visibility** — Resolved an issue where set names were not appearing on generated cards.

---

### 🔧 Developer Experience

- **Atomic Bulk Operations** — Added `addCustomCardsBulk` to the service layer for more efficient and reliable batch updates to the local database.
- **Build Chunking** — Implemented manual chunk splitting for heavy dependencies (jsPDF, html2canvas, etc.) to resolve bundle size warnings and improve load performance.

---

## 📦 [1.2.0] - December 28, 2025

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

### 🚀 Performance

- **Memory Optimization** — Reduced memory usage from ~1.3GB to ~400MB on large sets.
- **Lazy Grid Rendering** — Card images load only when scrolling into view using `IntersectionObserver`.
- **State Pruning** — Card objects stored in memory no longer include redundant `set` data.
- **PDF Generation Optimizations** — Explicit canvas disposal, direct canvas passing to jsPDF, and async yields.
- **Memory-Efficient Grid** — New `GridCard` component handles visibility detection and conditional rendering.

---

### 🔧 Developer Experience

- **HMR Fix** — Fixed WebSocket connection failures in dev mode when using the `/TcgPlaceholderGen/` base path.

---

### ⚠️ Known Issues

- **API Limitations** — Some nested queries require external merge strategy.
- **Missing Set Assets** — Some promo sets may lack high-res logos.
- **Large PDFs** — High-resolution captures result in larger file sizes.

---

## 🚀 Planned Features

- **Print Template Presets** — Save and switch between print profiles.
- **Custom Margins & Scale** — Fine-grained PDF layout control.
- **Watermark Customization** — Upload custom SVG or image watermarks.
- **Advanced Search Filters** — Filter by variant availability.
