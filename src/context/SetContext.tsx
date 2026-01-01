import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { PokemonSet } from '../types/pokemon';
import { pokemonTcgApi } from '../services/pokemonTcgApi';
import { getCustomSets, CustomSet } from '../services/customSets';
import { fetchTranslations, translateBatch } from '../services/translationService';

export type Language = 'en' | 'ja';

interface SetContextType {
    sets: PokemonSet[];
    customSets: CustomSet[];
    loading: boolean;
    translating: boolean;
    error: string | null;
    selectedSet: PokemonSet | null;
    language: Language;
    showEnglishNames: boolean;
    setLanguage: (lang: Language) => void;
    setShowEnglishNames: (show: boolean) => void;
    setSelectedSet: (set: PokemonSet | null) => void;
    fetchSets: () => Promise<void>;
    refreshCustomSets: () => void;
}

const SetContext = createContext<SetContextType | undefined>(undefined);

export function SetProvider({ children }: { children: ReactNode }) {
    const [sets, setSets] = useState<PokemonSet[]>([]);
    const [customSets, setCustomSets] = useState<CustomSet[]>([]);
    const [loading, setLoading] = useState(true);
    const [translating, setTranslating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedSet, setSelectedSet] = useState<PokemonSet | null>(null);

    const [language, setLanguageState] = useState<Language>(() => {
        const saved = localStorage.getItem('APP_LANGUAGE');
        return (saved as Language) || 'en';
    });

    const [showEnglishNames, setShowEnglishNamesState] = useState<boolean>(() => {
        return localStorage.getItem('APP_SHOW_ENGLISH_NAMES') === 'true';
    });

    const [translations, setTranslations] = useState<{
        names: Map<string, string>,
        series: Map<string, string>
    }>({
        names: new Map(),
        series: new Map()
    });

    const refreshCustomSets = () => {
        setCustomSets(getCustomSets());
    };

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('APP_LANGUAGE', lang);
        pokemonTcgApi.setLanguage(lang);
    };

    const setShowEnglishNames = (show: boolean) => {
        setShowEnglishNamesState(show);
        localStorage.setItem('APP_SHOW_ENGLISH_NAMES', show.toString());
    };

    const fetchSets = async () => {
        try {
            setLoading(true);
            pokemonTcgApi.setLanguage(language);

            // Fetch global translation dictionary from Supabase
            await fetchTranslations();

            const response = await pokemonTcgApi.getSets();
            setSets(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch sets. Please try again later.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Apply translation logic whenever sets or settings change
    useEffect(() => {
        const fetchRemoteTranslations = async () => {
            if (showEnglishNames && language === 'ja' && sets.length > 0) {
                setTranslating(true);
                try {
                    const uniqueNames = [...new Set(sets.map(s => s.name))];
                    const uniqueSeries = [...new Set(sets.map(s => s.series))];

                    const [translatedNamesList, translatedSeriesList] = await Promise.all([
                        translateBatch(uniqueNames, 'ja', 'en'),
                        translateBatch(uniqueSeries, 'ja', 'en')
                    ]);

                    const nameMap = new Map();
                    uniqueNames.forEach((name, i) => nameMap.set(name, translatedNamesList[i]));

                    const seriesMap = new Map();
                    uniqueSeries.forEach((series, i) => seriesMap.set(series, translatedSeriesList[i]));

                    setTranslations({ names: nameMap, series: seriesMap });
                } catch (err) {
                    console.error('Translation failed:', err);
                } finally {
                    setTranslating(false);
                }
            }
        };

        fetchRemoteTranslations();
    }, [showEnglishNames, language, sets]);

    // The final display sets
    const displaySets = useMemo(() => {
        if (!showEnglishNames || language !== 'ja' || sets.length === 0) {
            return sets;
        }

        return sets.map(set => ({
            ...set,
            name: translations.names.get(set.name) || set.name,
            series: translations.series.get(set.series) || set.series,
            originalName: set.name,
            originalSeries: set.series
        }));
    }, [sets, translations, showEnglishNames, language]);

    useEffect(() => {
        fetchSets();
        refreshCustomSets();
    }, [language]);

    return (
        <SetContext.Provider value={{
            sets: displaySets,
            customSets,
            loading,
            translating,
            error,
            selectedSet,
            setSelectedSet,
            language,
            showEnglishNames,
            setLanguage,
            setShowEnglishNames,
            fetchSets,
            refreshCustomSets,
        }}>
            {children}
        </SetContext.Provider>
    );
}

export const useSetContext = () => {
    const context = useContext(SetContext);
    if (context === undefined) {
        throw new Error('useSetContext must be used within a SetProvider');
    }
    return context;
};
