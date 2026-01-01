import { supabase } from './supabaseClient';

/**
 * Translation Service using MyMemory API (free, no CORS issues)
 * and Supabase for persistent caching.
 */

const TRANSLATE_API_URL = 'https://api.mymemory.translated.net/get';
const CACHE_KEY = 'TCG_TRANSLATIONS_CACHE';

interface TranslationRow {
    ja_name: string;
    en_name: string;
}

// Translation dictionary (mapped from Supabase)
let translationMap: Map<string, string> = new Map();

/**
 * Fetch all translations from Supabase dictionary
 */
export const fetchTranslations = async (): Promise<Map<string, string>> => {
    if (!supabase) return translationMap;

    try {
        const { data, error } = await supabase
            .from('translations')
            .select('ja_name, en_name');

        if (error) throw error;

        const newMap = new Map<string, string>();
        (data as TranslationRow[]).forEach(row => {
            newMap.set(row.ja_name, row.en_name);
        });

        translationMap = newMap;
        return translationMap;
    } catch (error) {
        console.error('Error fetching global translations:', error);
        return translationMap;
    }
};

/**
 * Get the current translation map
 */
export const getTranslationMap = () => translationMap;

// Load individual cache from localStorage (for things not in the global dictionary)
const loadCache = (): Record<string, string> => {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : {};
    } catch {
        return {};
    }
};

// Save individual cache to localStorage
const saveCache = (cache: Record<string, string>) => {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
        // localStorage might be full, ignore
    }
};

// Local translation cache
let translationCache = loadCache();

/**
 * Generate cache key for a translation
 */
const getCacheKey = (text: string, source: string, target: string): string => {
    return `${source}:${target}:${text}`;
};

/**
 * Translate a single text string
 * Priority: 1. Global Dictionary (Supabase) -> 2. Local Cache -> 3. MyMemory API
 */
export const translateText = async (
    text: string,
    sourceLang: string = 'ja',
    targetLang: string = 'en'
): Promise<string> => {
    if (!text || text.trim() === '') return text;

    // 1. Check Global Dictionary first (fast lookup)
    if (sourceLang === 'ja' && targetLang === 'en' && translationMap.has(text)) {
        return translationMap.get(text)!;
    }

    // 2. Check Local Cache
    const cacheKey = getCacheKey(text, sourceLang, targetLang);
    if (translationCache[cacheKey]) {
        return translationCache[cacheKey];
    }

    // 3. Fallback to MyMemory API
    try {
        const langPair = `${sourceLang}|${targetLang}`;
        const url = `${TRANSLATE_API_URL}?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;

        const response = await fetch(url);

        if (!response.ok) {
            console.warn('Translation API error:', response.status);
            return text;
        }

        const data = await response.json();
        const translated = data?.responseData?.translatedText || text;

        // Cache the result locally
        translationCache[cacheKey] = translated;
        saveCache(translationCache);

        return translated;
    } catch (error) {
        console.warn('Translation failed:', error);
        return text;
    }
};

/**
 * Translate multiple texts in batch
 * Translates each item individually (more reliable than delimiter approach)
 */
export const translateBatch = async (
    texts: string[],
    sourceLang: string = 'ja',
    targetLang: string = 'en'
): Promise<string[]> => {
    if (!texts || texts.length === 0) return texts;

    const results: string[] = [];

    // Translate each item individually
    // Add small delay between requests to avoid rate limiting
    for (let i = 0; i < texts.length; i++) {
        const text = texts[i];

        if (!text || !text.trim()) {
            results.push(text);
            continue;
        }

        try {
            const translated = await translateText(text, sourceLang, targetLang);
            results.push(translated);

            // Small delay to avoid overwhelming the API (every 10 requests)
            if (i % 10 === 9 && i < texts.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } catch (error) {
            console.warn(`Failed to translate item ${i}:`, error);
            results.push(text); // Fallback to original
        }
    }

    return results;
};

/**
 * Translate a search query from user's language to target data language
 * Used for searching Japanese data with English queries
 */
export const translateSearchQuery = async (
    query: string,
    targetLang: string = 'ja'
): Promise<string> => {
    if (!query || query.trim() === '') return query;

    // Don't translate if query looks like it's already in target language
    // Simple heuristic: if contains CJK characters, assume Japanese
    const hasCJK = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(query);
    if (hasCJK && targetLang === 'ja') return query;

    return translateText(query, 'en', targetLang);
};

/**
 * Clear the translation cache
 */
export const clearTranslationCache = () => {
    translationCache = {};
    localStorage.removeItem(CACHE_KEY);
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
    const keys = Object.keys(translationCache);
    return {
        entries: keys.length,
        sizeBytes: JSON.stringify(translationCache).length,
    };
};
