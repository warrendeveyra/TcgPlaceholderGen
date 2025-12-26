// TCGdex API Types - https://tcgdex.dev/
export interface TcgdexSet {
    id: string;
    name: string;
    logo?: string;
    symbol?: string;
    cardCount: {
        total: number;
        official: number;
    };
}

export interface TcgdexSetDetail extends TcgdexSet {
    releaseDate?: string;
    serie?: {
        id: string;
        name: string;
    };
    cards: TcgdexCardSummary[];
}

export interface TcgdexCardSummary {
    id: string;
    localId: string;
    name: string;
    image?: string;
}

export interface TcgdexCard {
    id: string;
    localId: string;
    name: string;
    image?: string;
    category: string;
    illustrator?: string;
    rarity?: string;
    hp?: number;
    types?: string[];
    evolveFrom?: string;
    description?: string;
    set: {
        id: string;
        name: string;
        logo?: string;
        symbol?: string;
    };
}

// Legacy types for backward compatibility with existing components
export interface PokemonSet {
    id: string;
    name: string;
    series: string;
    printedTotal: number;
    total: number;
    releaseDate: string;
    updatedAt: string;
    images: {
        symbol: string;
        logo: string;
    };
}

export interface PokemonCard {
    id: string;
    name: string;
    supertype: string;
    subtypes: string[];
    hp?: string;
    types?: string[];
    evolvesFrom?: string;
    attacks?: Array<{
        name: string;
        cost: string[];
        convertedRetreatCost: number;
        damage: string;
        text: string;
    }>;
    weaknesses?: Array<{
        type: string;
        value: string;
    }>;
    retreatCost?: string[];
    convertedRetreatCost?: number;
    set: {
        id: string;
        name: string;
        series: string;
        printedTotal: number;
        total: number;
        images: {
            symbol: string;
            logo: string;
        };
    };
    number: string;
    artist: string;
    rarity: string;
    flavorText?: string;
    nationalPokedexNumbers?: number[];
    images: {
        small: string;
        large: string;
    };
    variation?: 'Reverse' | 'Normal';
}

export interface ApiResponse<T> {
    data: T;
    page: number;
    pageSize: number;
    count: number;
    totalCount: number;
}
