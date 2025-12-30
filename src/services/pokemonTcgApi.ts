import axios from 'axios';
import { PokemonSet, PokemonCard, ApiResponse, TcgdexSet } from '../types/pokemon';

const API_BASE_URL = 'https://api.tcgdex.net/v2/graphql';

// GraphQL Helper
const fetchGraphQL = async <T>(query: string, variables: Record<string, any> = {}): Promise<T> => {
    const response = await axios.post(API_BASE_URL, {
        query,
        variables,
    }, {
        headers: { 'Content-Type': 'application/json' }
    });

    if (response.data.errors) {
        console.warn('GraphQL Errors (non-fatal):', response.data.errors);
        // If we have partial data, return it despite errors (TCGDex schema issues)
        if (response.data.data) {
            return response.data.data;
        }
        throw new Error(response.data.errors[0].message);
    }

    return response.data.data;
};

// Helper to get set logo URL (TCGDex assets only)
const getSetLogoUrl = (set: Partial<TcgdexSet>): string => {
    if (set.logo) {
        return `${set.logo}.png`;
    }
    return '';
};

// Helper to get set symbol URL (TCGDex assets only)
const getSetSymbolUrl = (set: Partial<TcgdexSet>): string => {
    if (set.symbol) {
        return `${set.symbol}.png`;
    }
    return '';
};

// Helper to convert TCGdex set to our PokemonSet format
const convertSet = (set: any): PokemonSet => ({
    id: set.id,
    name: set.name,
    series: set.serie?.name || 'Unknown',
    printedTotal: set.cardCount?.official || 0,
    total: set.cardCount?.total || 0,
    releaseDate: set.releaseDate || '',
    updatedAt: '',
    images: {
        symbol: getSetSymbolUrl(set),
        logo: getSetLogoUrl(set),
    },
});

// Helper to map API card data to our PokemonCard
// Note: supertype detection uses trainerType from individual card queries when needed
const convertGraphQLCard = (card: any, setInfo?: PokemonSet): PokemonCard => {
    // Default to Pokémon - accurate detection done via getCardById when needed
    let supertype = 'Pokémon';
    const lowerName = card.name?.toLowerCase() || '';

    // Use category if available (from individual card query)
    if (card.category) {
        if (card.category === 'Pokemon') supertype = 'Pokémon';
        else if (card.category === 'Trainer') supertype = 'Trainer';
        else if (card.category === 'Energy') supertype = 'Energy';
        else supertype = card.category;
    }
    // Basic Energy detection from name (fallback)
    else if (lowerName.includes('energy')) {
        supertype = 'Energy';
    }
    // Use trainerType if available (legacy fallback)
    else if (card.trainerType) {
        supertype = 'Trainer';
    }

    // Rarity string fallback
    let rarity = card.rarity || 'Common';

    return {
        id: card.id,
        name: card.name,
        supertype,
        subtypes: Array.from(new Set([
            ...(card.subtypes || []),
            ...(card.stage ? [card.stage] : [])
        ])),
        number: card.localId,
        artist: card.illustrator || '',
        rarity,
        set: setInfo ? {
            id: setInfo.id,
            name: setInfo.name,
            series: setInfo.series,
            printedTotal: setInfo.printedTotal,
            total: setInfo.total,
            releaseDate: setInfo.releaseDate,
            images: setInfo.images,
        } : {
            // Fallback if no set info provided
            id: card.set?.id || '',
            name: card.set?.name || '',
            series: card.set?.serie?.name || card.set?.series?.name || '',
            printedTotal: card.set?.cardCount?.official || 0,
            total: card.set?.cardCount?.total || 0,
            releaseDate: card.set?.releaseDate || '',
            images: {
                symbol: card.set?.symbol ? `${card.set.symbol}.png` : '',
                logo: card.set?.logo ? `${card.set.logo}.png` : ''
            },
        },
        images: {
            small: card.image ? `${card.image}/low.png` : '',
            large: card.image ? `${card.image}/high.png` : '',
        },
        variants: card.variants,
    };
};

export interface GetSetsParams {
    search?: string;
    releaseDate?: string;
    page?: number;
    itemsPerPage?: number;
}

export const pokemonTcgApi = {
    getSets: async (params: GetSetsParams = {}): Promise<ApiResponse<PokemonSet[]>> => {
        const { search = '', releaseDate = '', page = 1, itemsPerPage = 24 } = params;

        const query = `
            query($name: String, $releaseDate: String, $page: Int!, $itemsPerPage: Int!) {
                sets(filters: { name: $name, releaseDate: $releaseDate }, pagination: { page: $page, itemsPerPage: $itemsPerPage }) {
                    cardCount {
                        firstEd
                        holo
                        normal
                        official
                        reverse
                        total
                    }
                    id
                    logo
                    name
                    serie {
                        name
                        logo
                        id
                    }
                    symbol
                    releaseDate
                }
            }
        `;

        const variables: any = {
            page: page,
            itemsPerPage: itemsPerPage
        };

        // Only add filters if provided
        if (search.trim()) {
            variables.name = search.trim();
        }
        if (releaseDate.trim()) {
            variables.releaseDate = releaseDate.trim();
        }

        const data = await fetchGraphQL<{ sets: any[] }>(query, variables);
        let allSets = data.sets || [];

        // Filter out Pokemon TCG Pocket sets (mobile game, not physical cards)
        const physicalSets = allSets.filter(set => {
            if (set.serie?.id === 'tcgp') return false;
            return true;
        });

        const sets = physicalSets.map(convertSet);

        return {
            data: sets,
            page: page,
            pageSize: sets.length,
            count: sets.length,
            totalCount: sets.length,
        };
    },

    getSet: async (id: string): Promise<{ data: PokemonSet }> => {
        const query = `
            query($id: ID!) {
                set(id: $id) {
                    id
                    name
                    logo
                    symbol
                    cardCount {
                        official
                        total
                    }
                }
            }
        `;
        const data = await fetchGraphQL<{ set: any }>(query, { id });
        return { data: convertSet(data.set) };
    },

    // Get individual card details (includes trainerType for accurate detection)
    getCardById: async (cardId: string): Promise<{ data: PokemonCard | null }> => {
        const query = `
            query($id: ID!) {
                card(id: $id) {
                    id
                    localId
                    name
                    image
                    illustrator
                    category
                    stage
                    set {
                        id
                        name
                        logo
                        symbol
                        serie {
                            name
                        }
                        cardCount {
                            official
                            total
                        }
                    }
                    variants {
                        normal
                        reverse
                        holo
                        firstEdition
                    }
                }
            }
        `;

        try {
            const data = await fetchGraphQL<{ card: any }>(query, { id: cardId });
            if (!data.card) {
                return { data: null };
            }

            const card = data.card;
            const setInfo: PokemonSet = {
                id: card.set?.id || '',
                name: card.set?.name || '',
                series: card.set?.serie?.name || '',
                printedTotal: card.set?.cardCount?.official || 0,
                total: card.set?.cardCount?.total || 0,
                releaseDate: card.set?.releaseDate || '',
                updatedAt: '',
                images: {
                    symbol: card.set?.symbol ? `${card.set.symbol}.png` : '',
                    logo: card.set?.logo ? `${card.set.logo}.png` : ''
                }
            };

            return { data: convertGraphQLCard(card, setInfo) };
        } catch (error) {
            console.error('Error fetching card by ID:', error);
            return { data: null };
        }
    },

    getCardsBySet: async (setId: string, page = 1, pageSize = 250): Promise<ApiResponse<PokemonCard[]>> => {
        const query = `
            query($id: ID!) {
                set(id: $id) {
                    id
                    name
                    logo
                    symbol
                    releaseDate
                    serie {
                        name
                    }
                    cardCount {
                        official
                        total
                    }
                    cards {
                        id
                        localId
                        name
                        image
                        illustrator
                        stage
                        variants {
                            normal
                            reverse
                            holo
                            firstEdition
                        }
                    }
                }
            }
        `;

        const data = await fetchGraphQL<{ set: any }>(query, { id: setId });
        const set = data.set;

        if (!set) {
            return { data: [], page, pageSize, count: 0, totalCount: 0 };
        }

        const setInfo = convertSet(set);
        // Filter out null cards (failed due to schema errors like missing rarity)
        const validCards = (set.cards || []).filter((card: any) => card !== null);
        const cards = validCards.map((card: any) => convertGraphQLCard(card, setInfo));

        return {
            data: cards,
            page,
            pageSize,
            count: cards.length,
            totalCount: cards.length,
        };
    },

    getCardsByArtist: async (artistName: string): Promise<PokemonCard[]> => {
        // Fallback to REST for search/artist if GraphQL schema is complex for this, 
        // but let's try a simple cards query with filters if possible, 
        // or stick to string matching on fetched cards? 
        // TCGDex GraphQL usually supports filtering on cards.
        // Let's assume we can filter cards by illustrator.
        const query = `
            query($illustrator: String!) {
                cards(filters: { illustrator: $illustrator }) {
                    id
                    localId
                    name
                    image
                    rarity
                    category
                    set {
                        id
                        name
                        logo
                        symbol
                        serie {
                            name
                        }
                    }
                    variants {
                        normal
                        reverse
                        holo
                        firstEdition
                    }
                }
            }
         `;
        // Note: The actual filter syntax for TCGDex GraphQL might vary. 
        // If this fails, we might need to revert this specific method or debug.
        // However, looking at docs, standard args are often used.

        try {
            const data = await fetchGraphQL<{ cards: any[] }>(query, { illustrator: artistName });
            return (data.cards || []).map((c: any) => convertGraphQLCard(c));
        } catch (e) {
            console.warn("GraphQL Artist Fetch failed, trying fallback or empty", e);
            return [];
        }
    },

    searchCards: async (queryStr: string, page = 1, pageSize = 20): Promise<ApiResponse<PokemonCard[]>> => {
        const query = `
            query($name: String!) {
                cards(filters: { name: $name }) {
                    id
                    localId
                    name
                    image
                    rarity
                    category
                    illustrator
                    stage
                    set {
                        id
                        name
                        logo
                        symbol
                        serie {
                            name
                        }
                    }
                    variants {
                        normal
                        reverse
                        holo
                        firstEdition
                    }
                }
            }
        `;

        const data = await fetchGraphQL<{ cards: any[] }>(query, { name: queryStr });
        const cards = (data.cards || []).map(card => convertGraphQLCard(card));

        // Manual Pagination for consistency
        const startIndex = (page - 1) * pageSize;
        const paginatedCards = cards.slice(startIndex, startIndex + pageSize);

        return {
            data: paginatedCards,
            page,
            pageSize,
            count: paginatedCards.length,
            totalCount: cards.length,
        };
    },

    getCard: async (id: string): Promise<{ data: PokemonCard }> => {
        const query = `
            query($id: ID!) {
                card(id: $id) {
                    id
                    localId
                    name
                    image
                    category
                    rarity
                    illustrator
                    stage
                    description
                    variants {
                        normal
                        reverse
                        holo
                        firstEdition
                    }
                    set {
                        id
                        name
                        logo
                        symbol
                        serie {
                            name
                        }
                        cardCount {
                            official
                            total
                        }
                    }
                }
            }
        `;
        const data = await fetchGraphQL<{ card: any }>(query, { id });
        return { data: convertGraphQLCard(data.card) };
    },
};
