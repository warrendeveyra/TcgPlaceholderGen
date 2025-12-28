/**
 * Variant overrides for sets with special holo patterns
 * beyond the standard reverse holo.
 * 
 * Update this file as new sets release with special variants.
 */

// Sets with special holo variants - info for display and variant picking
export interface SpecialSetInfo {
    id: string;
    name: string;
    pokemonVariants: string[];  // Full variants for Pokémon cards
    trainerVariants: string[];  // Limited variants for Trainer cards (no Master Ball)
    description: string;        // Display text for users
}

export const SPECIAL_SETS: Record<string, SpecialSetInfo> = {
    // Scarlet & Violet - White Flare
    'sv10.5w': {
        id: 'sv10.5w',
        name: 'White Flare',
        pokemonVariants: ['Reverse Holo', 'Poke Ball Holo', 'Master Ball Holo'],
        trainerVariants: ['Reverse Holo', 'Poke Ball Holo'],
        description: 'This set has Reverse Holo, Poke Ball Holo, and Master Ball Holo variants. Trainers only get Reverse + Poke Ball.',
    },
    // Scarlet & Violet - Black Bolt
    'sv10.5b': {
        id: 'sv10.5b',
        name: 'Black Bolt',
        pokemonVariants: ['Reverse Holo', 'Poke Ball Holo', 'Master Ball Holo'],
        trainerVariants: ['Reverse Holo', 'Poke Ball Holo'],
        description: 'This set has Reverse Holo, Poke Ball Holo, and Master Ball Holo variants. Trainers only get Reverse + Poke Ball.',
    },
    // Scarlet & Violet - Prismatic Evolutions
    'sv08.5': {
        id: 'sv08.5',
        name: 'Prismatic Evolutions',
        pokemonVariants: ['Reverse Holo', 'Poke Ball Holo', 'Master Ball Holo'],
        trainerVariants: ['Reverse Holo', 'Poke Ball Holo'],
        description: 'This set has Reverse Holo, Poke Ball Holo, and Master Ball Holo variants. Trainers only get Reverse + Poke Ball.',
    },
};

// Default variants for sets not in overrides
export const DEFAULT_VARIANTS = ['Reverse Holo'];

/**
 * Check if a set has special variants beyond reverse holo
 * @param setId - The set ID
 * @returns true if set has special variants
 */
export function hasSpecialVariants(setId: string): boolean {
    return setId in SPECIAL_SETS;
}

/**
 * Get special set info for display
 * @param setId - The set ID
 * @returns SpecialSetInfo or null if not a special set
 */
export function getSpecialVariantInfo(setId: string): SpecialSetInfo | null {
    return SPECIAL_SETS[setId] || null;
}

/**
 * Get available variants for a card based on set, supertype, subtypes, and name
 * @param setId - The set ID
 * @param supertype - The card's supertype ('Pokémon', 'Trainer', 'Energy')
 * @param releaseYear - The release year of the set
 * @param subtypes - The card's subtypes (e.g., 'V', 'VMAX', 'GX', 'VSTAR', 'ex')
 * @param name - The card's name (e.g., 'Pikachu VMAX')
 * @returns Array of variant names available
 */
export function getSetVariants(
    setId: string,
    supertype?: string,
    releaseYear?: number,
    subtypes?: string[],
    name?: string
): string[] {
    // Special card types that already have a base holo pattern and no reverse holo variant
    const noVariantSubtypes = ['GX', 'V', 'VMAX', 'VSTAR', 'EX'];

    // Check subtypes
    const hasSpecialSubtype = subtypes && subtypes.some(st => noVariantSubtypes.includes(st.toUpperCase()));

    // Check name ending (e.g., "Pikachu VMAX" or "Zekrom ex")
    const cleanName = name?.trim() || '';
    const hasSpecialName = noVariantSubtypes.some(kw => {
        const regex = new RegExp(`\\b${kw}$`, 'i');
        return regex.test(cleanName);
    });

    if (hasSpecialSubtype || hasSpecialName) {
        return [];
    }

    const info = SPECIAL_SETS[setId];
    if (!info) {
        // Sets released before 2002 don't have variants (Reverse Holo, etc.)
        if (releaseYear && releaseYear < 2002) {
            return [];
        }
        return DEFAULT_VARIANTS;
    }

    // Trainer cards have limited variants
    if (supertype === 'Trainer') {
        return info.trainerVariants;
    }

    // Pokémon cards get all variants
    return info.pokemonVariants;
}
