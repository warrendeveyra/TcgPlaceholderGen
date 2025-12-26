import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Loader2, ChevronDown, ChevronUp, Eye, Plus, Minus } from 'lucide-react';
import { PokemonCard } from '../types/pokemon';
import { pokemonTcgApi } from '../services/pokemonTcgApi';
import { addCustomCard, getCustomCardsBySet, deleteCustomCard } from '../services/customSets';
import { useSetContext } from '../context/SetContext';
import CardImage from './CardImage';
import CardPreviewModal from './CardPreviewModal';
import { isReverseHoloEligible } from '../utils/pokemonUtils';

interface AddCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    setId: string;
    onCardAdded: () => void;
}

const AddCardModal: React.FC<AddCardModalProps> = ({ isOpen, onClose, setId, onCardAdded }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<PokemonCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedSets, setSelectedSets] = useState<Set<string>>(new Set());
    const [showSetFilter, setShowSetFilter] = useState(false);
    const [previewCard, setPreviewCard] = useState<PokemonCard | null>(null);
    const [searchMode, setSearchMode] = useState<'name' | 'artist'>('name');
    // Track quantities: card.id -> count
    const [cardQuantities, setCardQuantities] = useState<Map<string, number>>(new Map());
    // Track custom card IDs for removal: card.id -> [customCardId1, customCardId2, ...]
    const [addedCardIds, setAddedCardIds] = useState<Map<string, string[]>>(new Map());
    const [variationPickerCard, setVariationPickerCard] = useState<PokemonCard | null>(null);

    const { sets: officialSets } = useSetContext();

    // Initialize existing card quantities and default sets on mount
    useEffect(() => {
        if (isOpen) {
            // Pre-select first 5 physical sets if none selected
            if (selectedSets.size === 0 && officialSets.length > 0) {
                const defaultSets = officialSets.slice(0, 5).map(s => s.id);
                setSelectedSets(new Set(defaultSets));
            }

            // Build quantity map and ID arrays from existing cards
            const existingCards = getCustomCardsBySet(setId);
            const quantities = new Map<string, number>();
            const idArrays = new Map<string, string[]>();

            existingCards.forEach(c => {
                // Use original card id pattern to match search results
                const originalId = c.set?.id ? `${c.set.id}-${c.number}` : '';
                if (originalId) {
                    const currentQty = quantities.get(originalId) || 0;
                    quantities.set(originalId, currentQty + 1);

                    const currentIds = idArrays.get(originalId) || [];
                    currentIds.push(c.id);
                    idArrays.set(originalId, currentIds);
                }
            });

            setCardQuantities(quantities);
            setAddedCardIds(idArrays);
        }
    }, [isOpen, setId, officialSets]);

    // Search in selected sets or by artist
    const searchCards = useCallback(async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        if (searchMode === 'name' && selectedSets.size === 0) {
            setSearchResults([]);
            return;
        }

        setLoading(true);
        try {
            const allCards: PokemonCard[] = [];

            if (searchMode === 'name') {
                const setsToSearch = Array.from(selectedSets);
                // Search in selected sets
                for (const sid of setsToSearch) {
                    try {
                        const response = await pokemonTcgApi.getCardsBySet(sid);
                        const matches = response.data.filter(card =>
                            card.name.toLowerCase().includes(query.toLowerCase())
                        );
                        allCards.push(...matches);
                    } catch {
                        // Ignore errors for individual sets
                    }
                }
            } else {
                // Search by artist
                try {
                    const cards = await pokemonTcgApi.getCardsByArtist(query);
                    // Filter to only include cards from our official physical sets
                    const officialSetIds = new Set(officialSets.map(s => s.id));
                    const filteredCards = cards.filter(card => {
                        const sid = card.set?.id;
                        if (!sid) return false;
                        return officialSetIds.has(sid);
                    });

                    // Enrich filtered cards with full set info from officialSets context
                    const enrichedCards = filteredCards.map(card => {
                        const setInfo = officialSets.find(s => s.id === card.set.id);
                        if (setInfo) {
                            return {
                                ...card,
                                set: {
                                    ...card.set,
                                    name: setInfo.name,
                                    series: setInfo.series,
                                    images: setInfo.images,
                                    printedTotal: setInfo.printedTotal,
                                    total: setInfo.total,
                                }
                            };
                        }
                        return card;
                    });

                    allCards.push(...enrichedCards);
                } catch (err) {
                    console.error('Artist search error:', err);
                }
            }

            setSearchResults(allCards);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedSets, searchMode, officialSets]);

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm) {
                searchCards(searchTerm);
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, searchCards]);

    const toggleSet = (setIdToToggle: string) => {
        setSelectedSets(prev => {
            const newSet = new Set(prev);
            if (newSet.has(setIdToToggle)) {
                newSet.delete(setIdToToggle);
            } else {
                newSet.add(setIdToToggle);
            }
            return newSet;
        });
    };

    const selectAllSets = () => {
        setSelectedSets(new Set(officialSets.map(s => s.id)));
    };

    const clearAllSets = () => {
        setSelectedSets(new Set());
    };

    // Get quantity of a card
    const getCardQuantity = (cardId: string): number => {
        return cardQuantities.get(cardId) || 0;
    };

    // Add one copy of a card with specific variation
    const handleAddOne = (card: PokemonCard, variation: 'Normal' | 'Reverse' = 'Normal') => {
        const newCard = addCustomCard(
            setId,
            card.name,
            card.number,
            card.rarity || 'Common',
            card.images.small,
            card,
            variation
        );

        // Update quantity
        setCardQuantities(prev => {
            const newMap = new Map(prev);
            newMap.set(card.id, (prev.get(card.id) || 0) + 1);
            return newMap;
        });

        // Track the custom card ID
        setAddedCardIds(prev => {
            const newMap = new Map(prev);
            const ids = [...(prev.get(card.id) || []), newCard.id];
            newMap.set(card.id, ids);
            return newMap;
        });

        onCardAdded();
    };

    // Remove one copy of a card
    const handleRemoveOne = (card: PokemonCard) => {
        const qty = getCardQuantity(card.id);
        if (qty <= 0) return;

        const ids = addedCardIds.get(card.id) || [];
        if (ids.length > 0) {
            // Remove the last added card
            const idToRemove = ids[ids.length - 1];
            deleteCustomCard(idToRemove);

            // Update IDs
            setAddedCardIds(prev => {
                const newMap = new Map(prev);
                const newIds = ids.slice(0, -1);
                if (newIds.length === 0) {
                    newMap.delete(card.id);
                } else {
                    newMap.set(card.id, newIds);
                }
                return newMap;
            });

            // Update quantity
            setCardQuantities(prev => {
                const newMap = new Map(prev);
                const newQty = (prev.get(card.id) || 1) - 1;
                if (newQty <= 0) {
                    newMap.delete(card.id);
                } else {
                    newMap.set(card.id, newQty);
                }
                return newMap;
            });

            onCardAdded();
        }
    };

    const handleAddAll = () => {
        searchResults.forEach(card => {
            if (getCardQuantity(card.id) === 0) {
                handleAddOne(card);
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-white">Add Cards from Official Sets</h3>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Set Filter Toggle */}
                    <button
                        onClick={() => setShowSetFilter(!showSetFilter)}
                        className="flex items-center gap-2 mb-3 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        {showSetFilter ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        Filter by Sets ({selectedSets.size} selected)
                    </button>

                    {/* Set Filter Panel */}
                    {showSetFilter && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select sets to search</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={selectAllSets}
                                        className="text-xs text-pokemon-blue hover:underline"
                                    >
                                        Select All
                                    </button>
                                    <span className="text-slate-600">|</span>
                                    <button
                                        onClick={clearAllSets}
                                        className="text-xs text-slate-400 hover:underline"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                                {officialSets.map((set) => (
                                    <label
                                        key={set.id}
                                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${selectedSets.has(set.id)
                                            ? 'bg-pokemon-blue/20 border border-pokemon-blue/50'
                                            : 'bg-white/5 border border-transparent hover:bg-white/10'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedSets.has(set.id)}
                                            onChange={() => toggleSet(set.id)}
                                            className="sr-only"
                                        />
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedSets.has(set.id)
                                            ? 'bg-pokemon-blue border-pokemon-blue'
                                            : 'border-slate-500'
                                            }`}>
                                            {selectedSets.has(set.id) && (
                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="text-xs text-white truncate">{set.name}</span>
                                    </label>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => setSearchMode('name')}
                            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${searchMode === 'name'
                                ? 'bg-pokemon-blue text-white shadow-lg shadow-pokemon-blue/20'
                                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            Search by Name
                        </button>
                        <button
                            onClick={() => setSearchMode('artist')}
                            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${searchMode === 'artist'
                                ? 'bg-pokemon-blue text-white shadow-lg shadow-pokemon-blue/20'
                                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            Search by Artist
                        </button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={searchMode === 'name' ? "Search for Pokémon cards..." : "Enter artist name (e.g. Ken Sugimori)..."}
                            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-pokemon-blue/50 outline-none text-sm text-white"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="p-6 max-h-[50vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-pokemon-blue animate-spin mb-2" />
                            <p className="text-slate-400 text-sm">Searching {selectedSets.size} set(s)...</p>
                        </div>
                    ) : searchResults.length > 0 ? (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-slate-400 text-sm">{searchResults.length} results</p>
                                <button
                                    onClick={handleAddAll}
                                    className="text-sm text-pokemon-blue hover:text-pokemon-blue/80"
                                >
                                    Add All
                                </button>
                            </div>
                            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                                {searchResults.map((card) => {
                                    const qty = getCardQuantity(card.id);
                                    return (
                                        <motion.div
                                            key={card.id}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className={`relative cursor-pointer rounded-lg overflow-hidden border transition-all group ${qty > 0
                                                ? 'border-pokemon-green ring-2 ring-pokemon-green/50'
                                                : 'border-white/10 hover:border-pokemon-blue/50'
                                                }`}
                                        >
                                            <div onClick={() => {
                                                if (qty === 0) {
                                                    if (isReverseHoloEligible(card)) {
                                                        setVariationPickerCard(card);
                                                    } else {
                                                        handleAddOne(card);
                                                    }
                                                }
                                            }}>
                                                <CardImage
                                                    src={card.images.small}
                                                    alt={card.name}
                                                    className="w-full aspect-[2.5/3.5]"
                                                />
                                            </div>

                                            {/* View button - appears on hover */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPreviewCard(card);
                                                }}
                                                className="absolute top-1 right-1 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="View card"
                                            >
                                                <Eye className="w-3 h-3" />
                                            </button>

                                            {/* Quantity controls - shown when qty > 0 */}
                                            {qty > 0 && (
                                                <div className="absolute inset-0 bg-pokemon-green/40 flex flex-col items-center justify-center">
                                                    <div className="flex items-center gap-1 bg-black/70 rounded-full px-1 py-0.5">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveOne(card);
                                                            }}
                                                            className="p-1 rounded-full hover:bg-red-500/50 text-white transition-colors"
                                                            title="Remove one"
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <span className="text-white font-bold text-sm min-w-[20px] text-center">
                                                            {qty}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isReverseHoloEligible(card)) {
                                                                    setVariationPickerCard(card);
                                                                } else {
                                                                    handleAddOne(card);
                                                                }
                                                            }}
                                                            className="p-1 rounded-full hover:bg-green-500/50 text-white transition-colors"
                                                            title="Add one more"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <span className="text-[9px] text-white/80 mt-1">in collection</span>
                                                </div>
                                            )}

                                            <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
                                                <p className="text-[8px] text-white truncate font-medium">{card.name}</p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </>
                    ) : searchTerm.length >= 2 ? (
                        <div className="text-center py-12 text-slate-400">
                            <p>No cards found for "{searchTerm}"</p>
                            <p className="text-sm mt-1">
                                {searchMode === 'name'
                                    ? "Try selecting more sets or a different search term"
                                    : "Try a different artist name or check spelling"}
                            </p>
                        </div>
                    ) : selectedSets.size === 0 && searchMode === 'name' ? (
                        <div className="text-center py-12 text-slate-400">
                            <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>Please select at least one set to search</p>
                            <button
                                onClick={() => setShowSetFilter(true)}
                                className="mt-2 text-pokemon-blue hover:underline text-sm"
                            >
                                Open set filter
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-400">
                            <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>
                                {searchMode === 'name'
                                    ? "Search for Pokémon cards to add to your set"
                                    : "Search for cards by their illustrator"}
                            </p>
                            <p className="text-sm mt-1">Type at least 2 characters</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/10 bg-white/[0.02]">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-all"
                    >
                        Done
                    </button>
                </div>
            </motion.div>

            {/* Variation Picker Overlay */}
            {variationPickerCard && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                    >
                        <h4 className="text-lg font-bold text-white mb-2 text-center">Select Version</h4>
                        <p className="text-slate-400 text-sm mb-6 text-center">
                            This card is eligible for a Reverse Holo version. Which one would you like to add?
                        </p>

                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={() => {
                                    handleAddOne(variationPickerCard, 'Normal');
                                    setVariationPickerCard(null);
                                }}
                                className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-semibold transition-all flex items-center justify-between"
                            >
                                <span>Standard Version</span>
                                <div className="w-4 h-4 rounded-full border border-slate-500" />
                            </button>
                            <button
                                onClick={() => {
                                    handleAddOne(variationPickerCard, 'Reverse');
                                    setVariationPickerCard(null);
                                }}
                                className="w-full py-3 px-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl text-red-100 font-semibold transition-all flex items-center justify-between"
                            >
                                <span>Reverse Holo</span>
                                <div className="px-1.5 py-0.5 rounded bg-red-600 text-[10px] font-black uppercase">Rev</div>
                            </button>
                            <button
                                onClick={() => {
                                    handleAddOne(variationPickerCard, 'Normal');
                                    handleAddOne(variationPickerCard, 'Reverse');
                                    setVariationPickerCard(null);
                                }}
                                className="w-full py-3 px-4 bg-pokemon-blue/20 hover:bg-pokemon-blue/30 border border-pokemon-blue/50 rounded-xl text-pokemon-blue font-bold transition-all flex items-center justify-between"
                            >
                                <span>Add Both Versions</span>
                                <Plus className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setVariationPickerCard(null)}
                                className="mt-2 w-full py-2 text-slate-500 hover:text-white text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Card Preview Modal */}
            <CardPreviewModal
                card={previewCard}
                isOpen={!!previewCard}
                onClose={() => setPreviewCard(null)}
                onAdd={(card) => {
                    handleAddOne(card);
                    setPreviewCard(null);
                }}
                isAdded={previewCard ? getCardQuantity(previewCard.id) > 0 : false}
            />
        </div>
    );
};

export default AddCardModal;
