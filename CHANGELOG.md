# Changelog

All notable changes to the **TCG Placeholder Generator** project will be documented in this file.

## [1.2.0] - 2025-12-28

### Added

- **Persistent Print Settings**: Advanced print settings (watermark, visibility toggles, opacity, page size, and orientation) are now saved automatically to local storage and preserved across sessions.
- **Redesigned Advanced Settings Modal**: Improved horizontal balance with a cleaner visual grouping and refined vertical flow.
- **Granular Text Control**: Separate toggles for **Rarity Badge** and **Set Information** on printed cards, allowing for cleaner placeholder designs.
- **Improved Set Headers**: Sets now display their release year in the header, making it easier to distinguish between different eras of cards.
- **Special Card Variant Logic**: Automatically skips the variant picker for **GX, V, VMAX, VSTAR, and EX** cards, as these cards are already holographic and do not have standard variants.
- **Older Sets Support**: Users can now seamlessly add older sets and cards to their custom collections.
- **Robust Variant Selection**: New `VariationPicker` component ensures accurate handling of all card variants (Reverse Holo, Pokeball Holo, Masterball Holo) and supports adding duplicate copies of the same variant.
- **Set Data Merging**: Implemented a data merging strategy to preserve release dates and series information when fetching individual card details from the API.

### Changed

- **Modal Layout**: Increased default width of the Advanced Settings modal for a more spacious and professional feel.
- **Variant Logic**: Removed outdated pre-2002 variant disclaimers to streamline the UI for classic sets.
- **GraphQL Queries**: Optimized queries to fetch only necessary fields, improving loading times.

### Fixed

- **TCGDex API Stability**: Fixed critical crashes caused by nested resolver errors in the TCGDex GraphQL API.
- **"Unknown" Series Bug**: Resolved an issue where some sets would erroneously display the series as "Unknown".
- **TypeScript Data Integrity**: Fixed missing property errors in `customSets.ts` to ensure full compatibility with the new `PokemonSet` schema.

### Known Issues

- **API Resolver Limitations**: Direct fetching of nested `releaseDate` or `series` within a single card query is currently handled via an external merge strategy due to upstream API instability.
- **Missing Set Assets**: Some extremely niche or promotional sets may lack high-resolution logo assets; a generic placeholder badge is provided as a fallback.
- **Large PDF Download Size**: PDFs can be quite large due to high-resolution page captures (currently being optimized).

## [Planned Features]

- **Bulk Add to Custom Sets**: Add multiple cards or entire search results to a custom set with ONE click.
- **Print Template Presets**: Save and switch between different configuration profiles (e.g., "Full Proxies" vs "Text Only").
- **Custom Margin & Scale Controls**: Fine-grained control over PDF layout for perfect alignment on different printer models.
- **Watermark Customization**: Support for uploading custom SVG or Image watermarks.
- **Advanced Search Filters**: Filter search results by variant availability (e.g., "Only show cards with Reverse Holo variants").
