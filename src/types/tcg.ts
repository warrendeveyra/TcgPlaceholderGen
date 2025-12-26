// Abstract TCG interface for supporting multiple card games
export type TCGType = 'pokemon' | 'onepiece' | 'yugioh' | 'custom';

export interface TCGConfig {
    id: TCGType;
    name: string;
    shortName: string;
    color: string;
    apiEndpoint?: string;
    hasReverseHolos: boolean;
    rarityLevels: string[];
}

// Base card interface all TCGs share
export interface BaseCard {
    id: string;
    name: string;
    number: string;
    rarity: string;
    images: {
        small: string;
        large: string;
    };
    variation?: 'Normal' | 'Reverse' | 'Parallel' | 'Foil';
}

// Base set interface all TCGs share
export interface BaseSet {
    id: string;
    name: string;
    series: string;
    totalCards: number;
    printedTotal: number;
    releaseDate: string;
    images: {
        logo: string;
        symbol: string;
    };
    tcgType: TCGType;
}

// TCG-specific configurations
export const TCG_CONFIGS: Record<TCGType, TCGConfig> = {
    pokemon: {
        id: 'pokemon',
        name: 'Pokémon TCG',
        shortName: 'Pokemon',
        color: '#FFDE00',
        hasReverseHolos: true,
        rarityLevels: ['Common', 'Uncommon', 'Rare', 'Rare Holo', 'Rare Ultra', 'Secret Rare'],
    },
    onepiece: {
        id: 'onepiece',
        name: 'One Piece Card Game',
        shortName: 'One Piece',
        color: '#E21B22',
        hasReverseHolos: false,
        rarityLevels: ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Secret Rare', 'Leader', 'Special'],
    },
    yugioh: {
        id: 'yugioh',
        name: 'Yu-Gi-Oh!',
        shortName: 'Yu-Gi-Oh!',
        color: '#B5651D',
        hasReverseHolos: false,
        rarityLevels: ['Common', 'Rare', 'Super Rare', 'Ultra Rare', 'Secret Rare', 'Ultimate Rare'],
    },
    custom: {
        id: 'custom',
        name: 'Custom Sets',
        shortName: 'Custom',
        color: '#7B2CBF',
        hasReverseHolos: false,
        rarityLevels: ['Common', 'Uncommon', 'Rare', 'Ultra Rare'],
    },
};

// Helper to get TCG config
export const getTCGConfig = (type: TCGType): TCGConfig => {
    return TCG_CONFIGS[type] || TCG_CONFIGS.custom;
};

// Check if a card should have reverse holo based on TCG type and rarity
export const shouldHaveReverseHolo = (tcgType: TCGType, rarity: string): boolean => {
    const config = getTCGConfig(tcgType);
    if (!config.hasReverseHolos) return false;

    // Only Pokemon has reverse holos for regular rarities
    const reverseHoloRarities = ['Common', 'Uncommon', 'Rare', 'Rare Holo'];
    return reverseHoloRarities.includes(rarity);
};

// Abstract service interface for TCG APIs
export interface TCGApiService {
    getSets: () => Promise<BaseSet[]>;
    getCardsBySet: (setId: string) => Promise<BaseCard[]>;
    searchCards?: (query: string) => Promise<BaseCard[]>;
}
