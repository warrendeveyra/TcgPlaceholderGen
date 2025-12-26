import axios from 'axios';
import { PokemonSet, PokemonCard, ApiResponse, TcgdexSet, TcgdexSetDetail } from '../types/pokemon';

const API_BASE_URL = 'https://api.tcgdex.net/v2/en';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
});

// Helper to get set logo URL with fallback
const getSetLogoUrl = (set: TcgdexSet): string => {
    if (set.logo) {
        return `${set.logo}.png`;
    }
    // Fallback to pokemontcg.io image CDN
    return `https://images.pokemontcg.io/${set.id}/logo.png`;
};

// Helper to get set symbol URL with fallback
const getSetSymbolUrl = (set: TcgdexSet): string => {
    if (set.symbol) {
        return `${set.symbol}.png`;
    }
    // Fallback to pokemontcg.io image CDN
    return `https://images.pokemontcg.io/${set.id}/symbol.png`;
};

// Helper to convert TCGdex set to our PokemonSet format
const convertSet = (set: TcgdexSet): PokemonSet => ({
    id: set.id,
    name: set.name,
    series: set.id.replace(/\d+/g, '').toUpperCase() || 'Unknown',
    printedTotal: set.cardCount.official,
    total: set.cardCount.total,
    releaseDate: '',
    updatedAt: '',
    images: {
        symbol: getSetSymbolUrl(set),
        logo: getSetLogoUrl(set),
    },
});

// Helper to convert TCGdex card to our PokemonCard format
// TCGdex card list only has basic info, so we detect card type from name
const convertCard = (
    card: { id: string; localId: string; name: string; image?: string },
    setId: string,
    setInfo?: PokemonSet // Optional: full set info to include with card
): PokemonCard => {
    const nameLower = card.name.toLowerCase();

    // Detect rarity from card name for reverse holo logic
    let rarity = 'Common'; // Default
    if (nameLower.includes(' ex') || nameLower.endsWith(' ex')) rarity = 'Rare Ultra';
    else if (nameLower.includes(' gx') || nameLower.endsWith(' gx')) rarity = 'Rare Ultra';
    else if (nameLower.includes(' v') && !nameLower.includes('eevee')) rarity = 'Rare Ultra';
    else if (nameLower.includes(' vmax')) rarity = 'Rare Ultra';
    else if (nameLower.includes(' vstar')) rarity = 'Rare Ultra';
    else if (nameLower.includes('radiant ')) rarity = 'Radiant Rare';

    // Detect supertype
    let supertype = 'Pokémon';
    if (nameLower.includes('energy')) supertype = 'Energy';
    else if (nameLower.includes('trainer') || nameLower.includes('supporter') ||
        nameLower.includes('stadium') || nameLower.includes('item')) supertype = 'Trainer';

    return {
        id: card.id,
        name: card.name,
        supertype,
        subtypes: [],
        number: card.localId,
        artist: '',
        rarity,
        set: setInfo ? {
            id: setInfo.id,
            name: setInfo.name,
            series: setInfo.series,
            printedTotal: setInfo.printedTotal,
            total: setInfo.total,
            images: setInfo.images,
        } : {
            id: setId,
            name: '',
            series: '',
            printedTotal: 0,
            total: 0,
            images: { symbol: '', logo: '' },
        },
        images: {
            small: card.image ? `${card.image}/low.png` : '',
            large: card.image ? `${card.image}/high.png` : '',
        },
    };
};

export const pokemonTcgApi = {
    getSets: async (page = 1, pageSize = 50): Promise<ApiResponse<PokemonSet[]>> => {
        const response = await api.get<TcgdexSet[]>('/sets');

        // Filter out Pokemon TCG Pocket sets (mobile game, not physical cards)
        // TCG Pocket set IDs in TCGdex: A1, A1a, A2, A2a, MEP, etc.
        const physicalSets = response.data.filter(set => {
            const id = set.id.toUpperCase();
            // Exclude TCG Pocket sets
            // A-series (Genetic Apex, etc.), B-series, MEP (Promos)
            if (id.startsWith('A') && /\d/.test(id)) return false;
            if (id.startsWith('B') && /\d/.test(id)) return false;
            if (id.startsWith('MEP')) return false;
            if (id === 'P-A') return false;
            return true;
        });

        const sets = physicalSets.map(convertSet);

        // Paginate manually and reverse for newest first
        const sortedSets = sets.reverse();
        const startIndex = (page - 1) * pageSize;
        const paginatedSets = sortedSets.slice(startIndex, startIndex + pageSize);

        return {
            data: paginatedSets,
            page,
            pageSize,
            count: paginatedSets.length,
            totalCount: sets.length,
        };
    },

    getSet: async (id: string): Promise<{ data: PokemonSet }> => {
        const response = await api.get<TcgdexSet>(`/sets/${id}`);
        return { data: convertSet(response.data) };
    },

    getCardsBySet: async (setId: string, page = 1, pageSize = 250): Promise<ApiResponse<PokemonCard[]>> => {
        const response = await api.get<TcgdexSetDetail>(`/sets/${setId}`);

        // Build set info from the response to include with each card
        const setInfo: PokemonSet = {
            id: setId,
            name: response.data.name,
            series: response.data.id.replace(/\d+/g, '').toUpperCase() || 'Unknown',
            printedTotal: response.data.cardCount?.official || 0,
            total: response.data.cardCount?.total || 0,
            releaseDate: '',
            updatedAt: '',
            images: {
                symbol: response.data.symbol ? `${response.data.symbol}.png` : `https://images.pokemontcg.io/${setId}/symbol.png`,
                logo: response.data.logo ? `${response.data.logo}.png` : `https://images.pokemontcg.io/${setId}/logo.png`,
            },
        };

        // Pass set info to each card
        const cards = response.data.cards.map(card => convertCard(card, setId, setInfo));

        return {
            data: cards,
            page,
            pageSize,
            count: cards.length,
            totalCount: cards.length,
        };
    },

    getCardsByArtist: async (artistName: string): Promise<PokemonCard[]> => {
        const encodedArtist = encodeURIComponent(artistName);
        const response = await api.get<{ name: string; cards: any[] }>(`/illustrators/${encodedArtist}`);

        return response.data.cards.map(card => {
            // Card id in illustrator list is formatted as "setId-localId"
            // We can extract setId by taking everything before the last hyphen
            const parts = card.id.split('-');
            const setId = parts.length > 1 ? parts.slice(0, -1).join('-') : '';
            return convertCard(card, setId);
        });
    },

    searchCards: async (_query: string, page = 1, pageSize = 20): Promise<ApiResponse<PokemonCard[]>> => {
        // TCGdex doesn't have a direct search, return empty for now
        return {
            data: [],
            page,
            pageSize,
            count: 0,
            totalCount: 0,
        };
    },

    getCard: async (id: string): Promise<{ data: PokemonCard }> => {
        const [setId, cardId] = id.split('-');
        const response = await api.get(`/cards/${setId}/${cardId}`);
        return { data: convertCard(response.data, setId) };
    },
};
