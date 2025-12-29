import { PokemonSet, PokemonCard } from '../types/pokemon';

const CUSTOM_SETS_KEY = 'tcg_custom_sets';
const CUSTOM_CARDS_KEY = 'tcg_custom_cards';

export interface CustomSet extends PokemonSet {
    isCustom: true;
    createdAt: string;
}

export interface CustomCard extends PokemonCard {
    isCustom: true;
    customSetId: string;
}

/**
 * Generate a unique ID using timestamp + random hex
 * Format: prefix-timestamp-randomhex (e.g., "set-1766892899-a3f7b2")
 */
const generateUniqueId = (prefix: string): string => {
    const timestamp = Date.now().toString(36); // Base36 for shorter timestamp
    const randomHex = Math.random().toString(16).slice(2, 8); // 6 random hex chars
    return `${prefix}-${timestamp}-${randomHex}`;
};

// Get all custom sets from localStorage
export const getCustomSets = (): CustomSet[] => {
    try {
        const stored = localStorage.getItem(CUSTOM_SETS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

// Save custom sets to localStorage
export const saveCustomSets = (sets: CustomSet[]): void => {
    localStorage.setItem(CUSTOM_SETS_KEY, JSON.stringify(sets));
};

// Create a new custom set
export const createCustomSet = (name: string, series: string): CustomSet => {
    const id = generateUniqueId('set');
    const newSet: CustomSet = {
        id,
        name,
        series,
        printedTotal: 0,
        total: 0,
        releaseDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString(),
        images: {
            symbol: '',
            logo: '',
        },
        isCustom: true,
        createdAt: new Date().toISOString(),
    };

    const sets = getCustomSets();
    sets.push(newSet);
    saveCustomSets(sets);

    return newSet;
};

// Update a custom set
export const updateCustomSet = (id: string, updates: Partial<CustomSet>): CustomSet | null => {
    const sets = getCustomSets();
    const index = sets.findIndex(s => s.id === id);

    if (index === -1) return null;

    sets[index] = { ...sets[index], ...updates, updatedAt: new Date().toISOString() };
    saveCustomSets(sets);

    return sets[index];
};

// Delete a custom set
export const deleteCustomSet = (id: string): void => {
    const sets = getCustomSets().filter(s => s.id !== id);
    saveCustomSets(sets);

    // Also delete associated cards
    const cards = getCustomCards().filter(c => c.customSetId !== id);
    saveCustomCards(cards);
};

// Get all custom cards from localStorage
export const getCustomCards = (): CustomCard[] => {
    try {
        const stored = localStorage.getItem(CUSTOM_CARDS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

// Save custom cards to localStorage
export const saveCustomCards = (cards: CustomCard[]): void => {
    localStorage.setItem(CUSTOM_CARDS_KEY, JSON.stringify(cards));
};

// Get cards for a specific custom set
export const getCustomCardsBySet = (setId: string): CustomCard[] => {
    return getCustomCards().filter(c => c.customSetId === setId);
};

// Add a card to a custom set
export const addCustomCard = (
    setId: string,
    name: string,
    number: string,
    rarity: string = 'Common',
    imageUrl: string = '',
    sourceCard?: PokemonCard, // Optional: pass full card to preserve set info
    variation?: string // 'Normal', 'Reverse', 'Poke Ball Holo', 'Master Ball Holo', etc.
): CustomCard => {
    const id = generateUniqueId('card');
    const newCard: CustomCard = {
        id,
        name,
        supertype: sourceCard?.supertype || 'Pokémon',
        subtypes: sourceCard?.subtypes || [],
        number,
        artist: sourceCard?.artist || 'Custom',
        rarity,
        variation: variation || sourceCard?.variation || 'Normal',
        set: sourceCard?.set ? {
            id: sourceCard.set.id,
            name: sourceCard.set.name,
            series: sourceCard.set.series,
            printedTotal: sourceCard.set.printedTotal,
            total: sourceCard.set.total,
            releaseDate: sourceCard.set.releaseDate || '',
            images: sourceCard.set.images || { symbol: '', logo: '' },
        } : {
            id: setId,
            name: '',
            series: '',
            printedTotal: 0,
            total: 0,
            releaseDate: new Date().toISOString().split('T')[0],
            images: { symbol: '', logo: '' },
        },
        images: {
            small: imageUrl || sourceCard?.images.small || '',
            large: sourceCard?.images.large || imageUrl || '',
        },
        isCustom: true,
        customSetId: setId,
    };

    const cards = getCustomCards();
    cards.push(newCard);
    saveCustomCards(cards);

    // Update set counts
    updateSetCardCounts(setId);

    return newCard;
};

// Add multiple cards to a custom set at once (more efficient for bulk creation)
export const addCustomCardsBulk = (
    setId: string,
    cardsToAdd: Array<{
        name: string,
        number: string,
        rarity?: string,
        imageUrl?: string,
        sourceCard?: PokemonCard,
        variation?: string
    }>
): CustomCard[] => {
    const allCards = getCustomCards();
    const newCards: CustomCard[] = [];

    cardsToAdd.forEach(item => {
        const id = generateUniqueId('card');
        const newCard: CustomCard = {
            id,
            name: item.name,
            supertype: item.sourceCard?.supertype || 'Pokémon',
            subtypes: item.sourceCard?.subtypes || [],
            number: item.number,
            artist: item.sourceCard?.artist || 'Custom',
            rarity: item.rarity || 'Common',
            variation: item.variation || item.sourceCard?.variation || 'Normal',
            set: item.sourceCard?.set ? {
                id: item.sourceCard.set.id,
                name: item.sourceCard.set.name,
                series: item.sourceCard.set.series,
                printedTotal: item.sourceCard.set.printedTotal,
                total: item.sourceCard.set.total,
                releaseDate: item.sourceCard.set.releaseDate || '',
                images: item.sourceCard.set.images || { symbol: '', logo: '' },
            } : {
                id: setId,
                name: '',
                series: '',
                printedTotal: 0,
                total: 0,
                releaseDate: new Date().toISOString().split('T')[0],
                images: { symbol: '', logo: '' },
            },
            images: {
                small: item.imageUrl || item.sourceCard?.images.small || '',
                large: item.sourceCard?.images.large || item.imageUrl || '',
            },
            isCustom: true,
            customSetId: setId,
        };
        newCards.push(newCard);
        allCards.push(newCard);
    });

    saveCustomCards(allCards);
    updateSetCardCounts(setId);

    return newCards;
};

// Update a custom card
export const updateCustomCard = (id: string, updates: Partial<CustomCard>): CustomCard | null => {
    const cards = getCustomCards();
    const index = cards.findIndex(c => c.id === id);

    if (index === -1) return null;

    cards[index] = { ...cards[index], ...updates };
    saveCustomCards(cards);

    return cards[index];
};

// Delete a custom card
export const deleteCustomCard = (id: string): void => {
    const cards = getCustomCards();
    const card = cards.find(c => c.id === id);
    const setId = card?.customSetId;

    const filteredCards = cards.filter(c => c.id !== id);
    saveCustomCards(filteredCards);

    // Update set counts
    if (setId) {
        updateSetCardCounts(setId);
    }
};

// Delete multiple custom cards at once (more efficient than calling deleteCustomCard in a loop)
export const deleteCustomCards = (ids: string[]): void => {
    if (ids.length === 0) return;

    const cards = getCustomCards();
    const idsSet = new Set(ids);
    const cardsToDelete = cards.filter(c => idsSet.has(c.id));

    // Get unique set IDs that will be affected
    const affectedSetIds = [...new Set(cardsToDelete.map(c => c.customSetId))];

    // Filter out deleted cards
    const filteredCards = cards.filter(c => !idsSet.has(c.id));
    saveCustomCards(filteredCards);

    // Update counts for all affected sets
    affectedSetIds.forEach(setId => updateSetCardCounts(setId));
};

// Update card counts for a set
export const updateSetCardCounts = (setId: string): void => {
    const cards = getCustomCardsBySet(setId);
    const count = cards.length;

    updateCustomSet(setId, { total: count, printedTotal: count });
};

// Export custom data for backup
export const exportCustomData = (): string => {
    return JSON.stringify({
        sets: getCustomSets(),
        cards: getCustomCards(),
        exportedAt: new Date().toISOString(),
    });
};

// Import custom data from backup
export const importCustomData = (jsonString: string): boolean => {
    try {
        const data = JSON.parse(jsonString);
        if (data.sets) saveCustomSets(data.sets);
        if (data.cards) saveCustomCards(data.cards);
        return true;
    } catch {
        return false;
    }
};
