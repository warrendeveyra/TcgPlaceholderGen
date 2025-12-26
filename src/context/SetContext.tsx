import React, { createContext, useContext, useState, useEffect } from 'react';
import { PokemonSet } from '../types/pokemon';
import { pokemonTcgApi } from '../services/pokemonTcgApi';
import { getCustomSets, CustomSet } from '../services/customSets';

interface SetContextType {
    sets: PokemonSet[];
    customSets: CustomSet[];
    loading: boolean;
    error: string | null;
    selectedSet: PokemonSet | null;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    setSelectedSet: (set: PokemonSet | null) => void;
    fetchSets: () => Promise<void>;
    refreshCustomSets: () => void;
}

const SetContext = createContext<SetContextType | undefined>(undefined);

export const SetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [sets, setSets] = useState<PokemonSet[]>([]);
    const [customSets, setCustomSets] = useState<CustomSet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSet, setSelectedSet] = useState<PokemonSet | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const refreshCustomSets = () => {
        setCustomSets(getCustomSets());
    };

    const filteredSets = sets.filter(set =>
        set.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        set.series.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredCustomSets = customSets.filter(set =>
        set.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        set.series.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const fetchSets = async () => {
        try {
            setLoading(true);
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

    useEffect(() => {
        fetchSets();
        refreshCustomSets();
    }, []);

    return (
        <SetContext.Provider value={{
            sets: filteredSets,
            customSets: filteredCustomSets,
            loading,
            error,
            selectedSet,
            setSelectedSet,
            searchTerm,
            setSearchTerm,
            fetchSets,
            refreshCustomSets,
        }}>
            {children}
        </SetContext.Provider>
    );
};

export const useSetContext = () => {
    const context = useContext(SetContext);
    if (context === undefined) {
        throw new Error('useSetContext must be used within a SetProvider');
    }
    return context;
};
