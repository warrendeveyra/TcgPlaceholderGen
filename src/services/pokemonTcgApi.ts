import axios from 'axios';
import { PokemonSet, PokemonCard, TcgApiResponse } from '../types/pokemon';

const API_BASE_URL = 'https://api.tcgdex.net/v2/graphql';

interface GraphQLResponse<T> {
    data?: T;
    errors?: Array<{ message: string }>;
}

let currentLanguage = 'en';

// GraphQL Helper with Multi-language support
const fetchGraphQL = async <T>(query: string, variables: Record<string, any> = {}): Promise<T> => {
    const response = await axios.post<GraphQLResponse<T>>(API_BASE_URL, {
        query,
        variables,
    }, {
        headers: { 'Content-Type': 'application/json' }
    });

    const data = response.data;

    if (data.errors) {
        console.warn('GraphQL Errors:', data.errors);
        if (data.data) {
            return data.data;
        }
        throw new Error(data.errors[0].message);
    }

    if (!data.data) {
        throw new Error('No data returned from API');
    }

    return data.data;
};

// Cache to reuse set objects across different cards to save memory
const setCache = new Map<string, PokemonSet>();

// Helper to convert GraphQL set to our PokemonSet format
const convertSet = (set: any): PokemonSet => {
    const cached = setCache.get(set.id);
    if (cached) return cached;

    const newSet: PokemonSet = {
        id: set.id,
        name: set.name,
        series: set.serie?.name || 'Unknown',
        printedTotal: set.cardCount?.official || 0,
        total: set.cardCount?.total || 0,
        releaseDate: set.releaseDate || '',
        updatedAt: '',
        images: {
            symbol: set.symbol ? `${set.symbol}.png` : '',
            logo: set.logo ? `${set.logo}.png` : '',
        },
    };
    
    setCache.set(set.id, newSet);
    return newSet;
};

// Helper to map GraphQL card data to our PokemonCard
const convertGraphQLCard = (card: any, setInfo?: any): PokemonCard => {
    if (!card) {
        // Fallback for null card
        return {
            id: 'unknown',
            name: 'Unknown Card',
            supertype: 'Pokémon',
            subtypes: [],
            number: '0',
            artist: '',
            rarity: 'Common',
            set: setInfo ? convertSet(setInfo) : {} as any,
            images: { small: '', large: '' },
        };
    }

    // Heuristics for supertype since 'category' can be null/broken in API
    let supertype = 'Pokémon';
    const name = card.name?.toLowerCase() || '';

    if (card.category === 'Trainer') {
        supertype = 'Trainer';
    } else if (card.category === 'Energy' || name.includes('energy')) {
        supertype = 'Energy';
    } else if (card.category === 'Pokemon') {
        supertype = 'Pokémon';
    }
    // Note: We keep card.category check just in case it IS available for some cards,
    // but the query will likely omit it for reliability.

    const sInfo = setInfo || card.set;

    return {
        id: card.id,
        name: card.name,
        supertype,
        subtypes: card.subtypes || [],
        number: card.localId,
        artist: card.illustrator || '',
        rarity: card.rarity || 'Common',
        set: convertSet(sInfo),
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
}

export const pokemonTcgApi = {
    setLanguage: (lang: string) => {
        currentLanguage = lang;
    },

    getSets: async (params: GetSetsParams = {}): Promise<TcgApiResponse<PokemonSet[]>> => {
        const isEn = currentLanguage === 'en';

        // If not English, fetch both local and English names for hybrid search
        const query = isEn ? `
            query {
                sets: sets @locale(lang: "en") {
                    id
                    name
                    symbol
                    logo
                    releaseDate
                    serie { name }
                    cardCount { total official }
                }
            }
        ` : `
            query {
                local: sets @locale(lang: "${currentLanguage}") {
                    id
                    name
                    symbol
                    logo
                    releaseDate
                    serie { name }
                    cardCount { total official }
                }
                en: sets @locale(lang: "en") {
                    id
                    name
                    serie { name }
                }
            }
        `;

        try {
            const data = await fetchGraphQL<any>(query);
            let localSets = isEn ? data.sets : data.local;
            const englishSets = isEn ? [] : (data.en || []);

            // Create a map for quick English name/series lookup
            const enInfoMap = new Map();
            englishSets.forEach((s: any) => enInfoMap.set(s.id, { name: s.name, series: s.serie?.name }));

            let allSets = (localSets || []).map((set: any) => {
                const enInfo = enInfoMap.get(set.id);
                // If local series is missing or "Unknown", use English series
                if (!set.serie?.name || set.serie.name === 'Unknown') {
                    if (enInfo?.series) {
                        set.serie = { ...set.serie, name: enInfo.series };
                    }
                }
                return {
                    ...set,
                    nameEn: enInfo?.name
                };
            });

            // Exclude only the digital Pokémon TCG Pocket series
            const excludeSeries = ['Pokémon TCG Pocket'];
            allSets = allSets.filter((set: any) => {
                const isPocketId = set.id === 'tcgp';
                const isPocketSeries = set.serie && excludeSeries.includes(set.serie.name);
                return !isPocketId && !isPocketSeries;
            });

            // Aggressive Deduplication and Prioritization
            // We group by Name only for Japanese sets to merge all "ghost" duplicates (CS1a, S11, sv1a, etc.)
            const setPriorityMap = new Map<string, any>();
            
            allSets.forEach((set: any) => {
                const normalizedId = set.id.toLowerCase();
                const nameKey = set.name.toLowerCase().trim();
                
                // For Japanese locale, we are extremely aggressive with name-based merging
                // For English, we still use Name + Series to avoid merging "Base Set" from different eras
                const isJapanese = currentLanguage === 'ja';
                const dedupKey = isJapanese ? nameKey : `${nameKey}_${set.serie?.name || ''}`;
                
                const existing = setPriorityMap.get(dedupKey);
                
                if (!existing) {
                    setPriorityMap.set(dedupKey, set);
                    return;
                }

                // Prioritization logic to pick the "Real" set over "Ghost" sets
                let existingScore = 0;
                let currentScore = 0;

                // 1. Favor normalized case (CamelCase/Uppercase vs lowercase)
                if (existing.id !== existing.id.toLowerCase()) existingScore += 2;
                if (set.id !== set.id.toLowerCase()) currentScore += 2;

                // 2. Favor logo availability (Huge signal for a real set)
                if (existing.logo) existingScore += 10;
                if (set.logo) currentScore += 10;

                // 3. Favor correct series mapping for SV era (IDs starting with 'sv')
                const isSvId = normalizedId.startsWith('sv');
                const existingInSwSh = isSvId && (existing.serie?.name === 'Sword & Shield' || existing.serie?.name === '剣と盾');
                const currentInSwSh = isSvId && (set.serie?.name === 'Sword & Shield' || set.serie?.name === '剣と盾');

                if (existingInSwSh) existingScore -= 50; // Increased penalty
                if (currentInSwSh) currentScore -= 50;

                // 4. Favor higher official card counts (Crucial!)
                const existingCount = existing.cardCount?.official || 0;
                const currentCount = set.cardCount?.official || 0;
                if (currentCount > 0 && existingCount === 0) currentScore += 100; // MASSIVE bonus for sets with actual cards
                if (existingCount > 0 && currentCount === 0) existingScore += 100;
                
                if (currentCount > existingCount) currentScore += 10;
                if (existingCount > currentCount) existingScore += 10;

                // 5. Penalize "CS" IDs which are usually promo/duplicate sets in TCGdex
                if (existing.id.startsWith('CS')) existingScore -= 15;
                if (set.id.startsWith('CS')) currentScore -= 15;

                if (currentScore > existingScore) {
                    setPriorityMap.set(dedupKey, set);
                }
            });

            allSets = Array.from(setPriorityMap.values());

            if (params.search) {
                const search = params.search.toLowerCase();
                allSets = allSets.filter((s: any) => s.name.toLowerCase().includes(search));
            }

            const sets = allSets.map(convertSet);

            return {
                data: sets,
                page: 1,
                pageSize: sets.length,
                count: sets.length,
                totalCount: sets.length,
            };
        } catch (error) {
            console.error('Error fetching sets:', error);
            return { data: [], page: 1, pageSize: 0, count: 0, totalCount: 0 };
        }
    },

    getSet: async (id: string): Promise<{ data: PokemonSet }> => {
        const query = `
            query ($id: ID!) {
                set(id: $id) @locale(lang: "${currentLanguage}") {
                    id
                    name
                    symbol
                    logo
                    releaseDate
                    serie {
                        name
                    }
                    cardCount {
                        total
                        official
                    }
                }
            }
        `;
        const data = await fetchGraphQL<{ set: any }>(query, { id });
        if (!data.set) throw new Error('Set not found');
        return { data: convertSet(data.set) };
    },

    getCardById: async (cardId: string): Promise<{ data: PokemonCard | null }> => {
        try {
            const data = await pokemonTcgApi.getCard(cardId);
            return { data: data.data };
        } catch (error) {
            console.error('Error fetching card by ID:', error);
            return { data: null };
        }
    },

    getCardsBySet: async (setId: string, retryConfig?: { isRetry?: boolean, localeOverride?: string }): Promise<TcgApiResponse<PokemonCard[]>> => {
        const locale = retryConfig?.localeOverride || currentLanguage;
        const query = `
            query ($id: ID!) {
                set(id: $id) @locale(lang: "${locale}") {
                    id
                    name
                    symbol
                    logo
                    releaseDate
                    serie {
                        name
                    }
                    cardCount {
                        total
                        official
                    }
                    cards {
                        id
                        localId
                        name
                        image
                        illustrator
                    }
                }
            }
        `;
        const data = await fetchGraphQL<{ set: any }>(query, { id: setId });
        
        if (!data.set) {
            // If completely missing and not a retry, try uppercase ID
            if (!retryConfig?.isRetry && setId !== setId.toUpperCase()) {
                return pokemonTcgApi.getCardsBySet(setId.toUpperCase(), { isRetry: true });
            }
            return { data: [], page: 1, pageSize: 0, count: 0, totalCount: 0 };
        }

        let cards = (data.set.cards || [])
            .filter((card: any) => card !== null)
            .map((card: any) => convertGraphQLCard(card, data.set));

        // FALLBACK: If 0 cards returned, try variants regardless of metadata
        // TCGdex often has "ghost" sets with 0 official cards but the cards exist in the index.
        if (cards.length === 0 && !retryConfig?.isRetry) {
            console.log(`Fallback triggered for set ${setId}: 0 cards returned.`);
            
            // Try 1: Uppercase/Lowercase swap (case sensitivity varies in TCGdex)
            const altId = setId === setId.toUpperCase() ? setId.toLowerCase() : setId.toUpperCase();
            const altTry = await pokemonTcgApi.getCardsBySet(altId, { isRetry: true });
            if (altTry.data.length > 0) return altTry;

            // Try 2: English locale
            if (locale !== 'en') {
                const enTry = await pokemonTcgApi.getCardsBySet(setId, { isRetry: true, localeOverride: 'en' });
                if (enTry.data.length > 0) return enTry;
            }

            // Try 3: REST API Fallback (bypass GraphQL limitations and broken metadata)
            // The REST API is more robust for these Japanese sets and supports the 'set' filter.
            console.log(`Fallback Try 3: Querying REST API for set ${setId}`);
            try {
                const idsToTry = [setId, setId.toUpperCase(), setId.toLowerCase()];
                const uniqueIds = [...new Set(idsToTry)];
                
                for (const idToTry of uniqueIds) {
                    const restUrl = `https://api.tcgdex.net/v2/${locale}/cards?set=${idToTry}`;
                    const response = await fetch(restUrl);
                    if (response.ok) {
                        const restCards = await response.json();
                        if (Array.isArray(restCards) && restCards.length > 0) {
                            // Map REST card structure to our PokemonCard structure
                            // REST cards have a slightly different structure than GraphQL
                            const mappedCards = restCards.map(c => ({
                                id: c.id,
                                localId: c.localId,
                                name: c.name,
                                image: c.image,
                                illustrator: c.illustrator,
                                // We need to simulate the nested set info for convertGraphQLCard logic
                                set: data.set || { id: idToTry, name: data.set?.name || setId }
                            })).map(c => convertGraphQLCard(c));

                            console.log(`Fallback Try 3 (REST) SUCCESS for set ${setId} using ID ${idToTry}: Found ${mappedCards.length} cards.`);
                            return {
                                data: mappedCards,
                                page: 1,
                                pageSize: mappedCards.length,
                                count: mappedCards.length,
                                totalCount: mappedCards.length,
                            };
                        }
                    }
                }
            } catch (e) {
                console.warn(`Fallback Try 3 (REST) failed for ${setId}:`, e);
            }

            // Try 4: Research-based fallback (Future)
            console.warn(`All card fetch fallbacks failed for ${setId}.`);
        }

        return {
            data: cards,
            page: 1,
            pageSize: cards.length,
            count: cards.length,
            totalCount: cards.length,
        };
    },

    getCardsByArtist: async (artistName: string): Promise<PokemonCard[]> => {
        const query = `
            query ($illustrator: String!) {
                cards(filters: { illustrator: $illustrator }) @locale(lang: "${currentLanguage}") {
                    id
                    localId
                    name
                    image
                    illustrator
                    set {
                        id
                        name
                        symbol
                        logo
                        releaseDate
                        serie {
                            name
                        }
                    }
                }
            }
        `;
        try {
            const data = await fetchGraphQL<{ cards: any[] }>(query, { illustrator: artistName });
            return (data.cards || [])
                .filter(c => c !== null)
                .map(c => convertGraphQLCard(c));
        } catch (e) {
            console.error('Error fetching cards by artist:', e);
            return [];
        }
    },

    searchCards: async (queryStr: string): Promise<TcgApiResponse<PokemonCard[]>> => {
        const query = `
            query ($name: String!) {
                cards(filters: { name: $name }) @locale(lang: "${currentLanguage}") {
                    id
                    localId
                    name
                    image
                    illustrator
                    set {
                        id
                        name
                        symbol
                        logo
                        releaseDate
                        serie {
                            name
                        }
                    }
                }
            }
        `;
        const data = await fetchGraphQL<{ cards: any[] }>(query, { name: queryStr });
        const cards = (data.cards || [])
            .filter(card => card !== null)
            .map(card => convertGraphQLCard(card));

        return {
            data: cards,
            page: 1,
            pageSize: cards.length,
            count: cards.length,
            totalCount: cards.length,
        };
    },

    getCard: async (id: string): Promise<{ data: PokemonCard }> => {
        const query = `
            query ($id: ID!) {
                card(id: $id) @locale(lang: "${currentLanguage}") {
                    id
                    localId
                    name
                    image
                    illustrator
                    subtypes
                    variants {
                        firstEdition
                        holo
                        normal
                        reverse
                        wPromo
                    }
                    set {
                        id
                        name
                        symbol
                        logo
                        releaseDate
                        serie {
                            name
                        }
                        cardCount {
                            total
                            official
                        }
                    }
                }
            }
        `;
        const data = await fetchGraphQL<{ card: any }>(query, { id });
        if (!data.card) throw new Error('Card not found');
        return { data: convertGraphQLCard(data.card) };
    },
};

