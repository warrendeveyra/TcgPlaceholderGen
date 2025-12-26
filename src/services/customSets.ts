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
    const id = `custom-${Date.now()}`;
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
    variation?: 'Reverse' | 'Normal'
): CustomCard => {
    const id = `${setId}-${Date.now()}`;
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
            images: sourceCard.set.images || { symbol: '', logo: '' },
        } : {
            id: setId,
            name: '',
            series: '',
            printedTotal: 0,
            total: 0,
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

// Update card counts for a set
const updateSetCardCounts = (setId: string): void => {
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
