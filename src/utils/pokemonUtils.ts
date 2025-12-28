import { PokemonCard } from '../types/pokemon';

export const isReverseHoloEligible = (card: PokemonCard): boolean => {
    if (!card.rarity || !card.set) return false;

    // If API provides explicit variant info, use it!
    if (card.variants) {
        return !!card.variants.reverse;
    }

    // FALLBACK: Guess based on rules if variants data is missing (e.g. from Set List endpoint)

    // Rarities that DO have reverse holos (standard cards)
    const regularRarities = ['Common', 'Uncommon', 'Rare', 'Rare Holo'];
    const isRegularRarity = regularRarities.includes(card.rarity);

    // Cards like EX, V, Radiant, ACE SPEC, etc. NEVER have reverse holos
    const isSpecialType = card.name.includes(' ex') ||
        card.name.includes(' V') ||
        card.name.includes(' GX') ||
        card.rarity?.toLowerCase().includes('ultra') ||
        card.rarity?.toLowerCase().includes('secret') ||
        card.rarity?.toLowerCase().includes('illustration') ||
        card.rarity?.toLowerCase().includes('special') ||
        card.rarity?.toLowerCase().includes('ace spec') || // Explicit rarity check
        card.rarity?.toLowerCase().includes('unique') ||   // Often used for unique cards
        (card as any).subtypes?.includes('ACE SPEC');      // Check subtypes if available

    // Promo sets usually don't have reverse holos for the promos themselves
    const setId = card.set.id.toLowerCase();
    const isPromoSet = setId.includes('p') || setId.includes('promo');

    // Energy check
    const isEnergy = card.supertype === 'Energy';

    // Number check (must be within printed total)
    const cardNum = parseInt(card.number.replace(/\D/g, ''));
    const printedTotal = card.set.printedTotal || 999;
    const isWithinPrintedTotal = !isNaN(cardNum) && cardNum <= printedTotal;

    return isRegularRarity && !isSpecialType && !isPromoSet && !isEnergy && isWithinPrintedTotal;
};
