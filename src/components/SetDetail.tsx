import React, { useEffect, useState } from 'react';
import { PokemonCard, PokemonSet } from '../types/pokemon';
import { pokemonTcgApi } from '../services/pokemonTcgApi';
import { getCustomCardsBySet, deleteCustomCard, deleteCustomCards, deleteCustomSet, createCustomSet, addCustomCard } from '../services/customSets';
import { ArrowLeft, Loader2, Printer, Plus, Trash2, Eye, AlertTriangle, Edit2, Info, Copy, CheckSquare, Square, X, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import PrintView from './PrintView';
import BinderCalculator from './BinderCalculator';
import AddCardModal from './AddCardModal';
import CardPreviewModal from './CardPreviewModal';
import EditCustomSetModal from './EditCustomSetModal';
import SuccessModal from './SuccessModal';
import ShareSetModal from './ShareSetModal';
import { shareCustomSet } from '../services/shareService';
import { useSetContext } from '../context/SetContext';
import { hasSpecialVariants, getSpecialVariantInfo } from '../utils/variantOverrides';

interface SetDetailProps {
    set: PokemonSet & { isCustom?: boolean };
    onBack: () => void;
    onNavigateToSet?: (set: PokemonSet & { isCustom?: boolean }) => void;
}

const SetDetail: React.FC<SetDetailProps> = ({ set, onBack, onNavigateToSet }) => {
    const [cards, setCards] = useState<PokemonCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [includeFullArts, setIncludeFullArts] = useState(true);
    const [showPrintView, setShowPrintView] = useState(false);
    const [showAddCard, setShowAddCard] = useState(false);
    const [previewCard, setPreviewCard] = useState<PokemonCard | null>(null);
    const [showDeleteSetConfirm, setShowDeleteSetConfirm] = useState(false);
    const [showEditSet, setShowEditSet] = useState(false);
    const [currentSet, setCurrentSet] = useState(set);
    const [createdCustomSet, setCreatedCustomSet] = useState<(PokemonSet & { isCustom?: boolean }) | null>(null);
    const [showCreateConfirm, setShowCreateConfirm] = useState(false);

    // Selection mode state
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    // Share state
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [isSharing, setIsSharing] = useState(false);

    const { refreshCustomSets } = useSetContext();

    const isCustomSet = !!currentSet.isCustom;

    // Keep local set in sync if prop changes
    useEffect(() => {
        setCurrentSet(set);
    }, [set]);

    const refreshCards = () => {
        if (set.isCustom) {
            setCards(getCustomCardsBySet(set.id));
        }
    };

    useEffect(() => {
        const fetchCards = async () => {
            try {
                setLoading(true);
                if (set.isCustom) {
                    // Load custom cards from localStorage
                    const customCards = getCustomCardsBySet(set.id);
                    setCards(customCards);
                } else {
                    // Load from API
                    const response = await pokemonTcgApi.getCardsBySet(set.id);
                    setCards(response.data);
                }
            } catch (err) {
                setError('Failed to load cards for this set.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchCards();
    }, [set.id, set.isCustom]);

    const [cardToDelete, setCardToDelete] = useState<PokemonCard | null>(null);

    const confirmDeleteCard = () => {
        if (cardToDelete) {
            deleteCustomCard(cardToDelete.id);
            setCards(getCustomCardsBySet(set.id));
            setCardToDelete(null);
        }
    };

    const handleAddCard = (card: PokemonCard, variation?: string) => {
        addCustomCard(
            currentSet.id,
            card.name,
            card.number,
            card.rarity || 'Common',
            card.images.small,
            card,
            variation || card.variation || 'Normal'
        );
        refreshCards();
    };

    const handleRemoveCard = (card: PokemonCard) => {
        const variation = card.variation || 'Normal';
        const cardToRemove = [...cards].reverse().find(c =>
            c.number === card.number &&
            (c.variation || 'Normal') === variation
        );

        if (cardToRemove) {
            deleteCustomCard(cardToRemove.id);
            refreshCards();
        }
    };

    // Selection mode functions
    const toggleCardSelection = (cardId: string) => {
        setSelectedCardIds(prev => {
            const next = new Set(prev);
            if (next.has(cardId)) {
                next.delete(cardId);
            } else {
                next.add(cardId);
            }
            return next;
        });
    };

    const selectAllCards = () => {
        const allIds = new Set(displayCards.map(c => c.id));
        setSelectedCardIds(allIds);
    };

    const deselectAllCards = () => {
        setSelectedCardIds(new Set());
    };

    const exitSelectMode = () => {
        setIsSelectMode(false);
        setSelectedCardIds(new Set());
    };

    const confirmBulkDelete = () => {
        if (selectedCardIds.size > 0) {
            deleteCustomCards(Array.from(selectedCardIds));
            refreshCards();
            exitSelectMode();
            setShowBulkDeleteConfirm(false);
        }
    };

    const handleShareSet = async () => {
        setIsSharing(true);
        const result = await shareCustomSet(currentSet, cards);
        setIsSharing(false);

        if (result.success && result.shareUrl) {
            setShareUrl(result.shareUrl);
            setShowShareModal(true);
        } else {
            alert(result.error || 'Failed to share set');
        }
    };

    const getFilteredCards = () => {
        let baseCards = cards;

        // Filter out cards past the printed total if full arts are disabled
        if (!includeFullArts) {
            baseCards = baseCards.filter(card => {
                const num = parseInt(card.number.replace(/\D/g, ''));
                const printedTotal = card.set.printedTotal || 999;
                return isNaN(num) || num <= printedTotal;
            });
        }

        // For official sets, just return the cards
        if (!isCustomSet) {
            return baseCards;
        }

        // For custom sets, sort cards by number then by variation type
        // so variants appear next to their normal card
        const variationOrder: Record<string, number> = {
            'Normal': 0,
            'Reverse': 1,
            'Reverse Holo': 1,
            'Poke Ball Holo': 2,
            'Master Ball Holo': 3,
        };

        return [...baseCards].sort((a, b) => {
            // First sort by card number
            const numA = parseInt(a.number.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.number.replace(/\D/g, '')) || 0;

            if (numA !== numB) {
                return numA - numB;
            }

            // Then sort by variation type
            const orderA = variationOrder[a.variation || 'Normal'] ?? 99;
            const orderB = variationOrder[b.variation || 'Normal'] ?? 99;
            return orderA - orderB;
        });
    };

    const displayCards = getFilteredCards();

    if (showPrintView) {
        return (
            <PrintView
                cards={displayCards}
                onClose={() => setShowPrintView(false)}
            />
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 text-pokemon-yellow animate-spin" />
                <p className="text-slate-400">Loading {set.name} cards...</p>
            </div>
        );
    }

    return (
        <div className="w-full">
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            refreshCustomSets();
                            onBack();
                        }}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-bold text-white leading-tight">
                                {currentSet.name}
                                {currentSet.releaseDate && !isCustomSet && (
                                    <span className="ml-3 text-lg font-medium text-slate-500">
                                        ({currentSet.releaseDate.split('-')[0]})
                                    </span>
                                )}
                            </h2>
                            {isCustomSet && (
                                <button
                                    onClick={() => setShowEditSet(true)}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-pokemon-purple transition-all"
                                    title="Edit set info"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <p className="text-slate-400 text-sm mt-1">
                            {!isCustomSet && currentSet.series && currentSet.series !== 'Unknown' && (
                                <>
                                    <span className="text-pokemon-blue font-medium">{currentSet.series}</span>
                                    <span className="mx-2 opacity-50">•</span>
                                </>
                            )}
                            {cards.length} Cards
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!isCustomSet && (
                        <>
                            <button
                                onClick={() => setShowCreateConfirm(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pokemon-purple/20 hover:bg-pokemon-purple/30 border border-pokemon-purple/50 transition-all text-sm font-medium text-pokemon-purple"
                                title="Create a custom copy of this set to add variant cards"
                            >
                                <Copy className="w-4 h-4" />
                                Create Custom Set
                            </button>

                            <button
                                onClick={() => setIncludeFullArts(!includeFullArts)}
                                className={`px-4 py-2 rounded-xl border transition-all text-sm font-medium ${includeFullArts
                                    ? 'bg-pokemon-yellow/20 border-pokemon-yellow/50 text-pokemon-yellow'
                                    : 'bg-white/5 border-white/10 text-slate-400'
                                    }`}
                            >
                                Full Arts: {includeFullArts ? 'On' : 'Off'}
                            </button>
                        </>
                    )}

                    {isCustomSet && (
                        <>
                            {isSelectMode ? (
                                <button
                                    onClick={exitSelectMode}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-sm font-medium text-white"
                                >
                                    <X className="w-4 h-4" />
                                    Cancel
                                </button>
                            ) : (
                                <button
                                    onClick={() => setIsSelectMode(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pokemon-purple/20 hover:bg-pokemon-purple/30 border border-pokemon-purple/50 transition-all text-sm font-medium text-pokemon-purple"
                                    disabled={displayCards.length === 0}
                                >
                                    <CheckSquare className="w-4 h-4" />
                                    Select
                                </button>
                            )}
                            <button
                                onClick={handleShareSet}
                                disabled={isSharing || displayCards.length === 0}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pokemon-blue/20 hover:bg-pokemon-blue/30 border border-pokemon-blue/50 transition-all text-sm font-medium text-pokemon-blue disabled:opacity-50"
                            >
                                {isSharing ? (
                                    <span className="w-4 h-4 border-2 border-pokemon-blue/30 border-t-pokemon-blue rounded-full animate-spin" />
                                ) : (
                                    <Share2 className="w-4 h-4" />
                                )}
                                Share
                            </button>
                            <button
                                onClick={() => setShowDeleteSetConfirm(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 transition-all text-sm font-semibold text-red-400 hover:text-red-300"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Set
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => setShowPrintView(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pokemon-blue hover:bg-pokemon-blue/90 transition-all text-sm font-semibold text-white shadow-lg shadow-pokemon-blue/20"
                    >
                        <Printer className="w-4 h-4" />
                        Print
                    </button>
                </div>
            </header>

            <BinderCalculator totalCards={displayCards.length} />

            {/* Disclaimer for Special Sets with Variants */}
            {!isCustomSet && (
                (() => {
                    const hasSpecial = hasSpecialVariants(currentSet.id);
                    const releaseYear = currentSet.releaseDate ? parseInt(currentSet.releaseDate.split('-')[0]) : 0;

                    if (hasSpecial) {
                        const variantInfo = getSpecialVariantInfo(currentSet.id);
                        return (
                            <div className="mb-6 p-4 rounded-xl bg-pokemon-blue/10 border border-pokemon-blue/30 flex items-start gap-3">
                                <Info className="w-5 h-5 text-pokemon-blue flex-shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="text-white font-medium mb-1">Special Variant Set</p>
                                    <p className="text-slate-300">
                                        {variantInfo?.description || 'This set has special holo variants available.'}
                                    </p>
                                    <p className="text-slate-400 mt-2">
                                        To track variant cards, use "Create Custom Set" and add cards with their specific variants.
                                    </p>
                                </div>
                            </div>
                        );
                    } else if (releaseYear >= 2002) {
                        return (
                            <div className="mb-6 p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-start gap-3">
                                <Info className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="text-white font-medium mb-1">Standard Reverse Holo Set</p>
                                    <p className="text-slate-300">
                                        This set contains <span className="text-pokemon-purple font-medium">Reverse Holo</span> variants for most Pokémon and Trainer cards.
                                    </p>
                                    <p className="text-slate-400 mt-2">
                                        To track your Master Set, use "Create Custom Set" and manually add the Reverse Holo versions.
                                    </p>
                                </div>
                            </div>
                        );
                    }
                    return null;
                })()
            )}

            {error ? (
                <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-center text-red-400">
                    {error}
                </div>
            ) : (
                <>
                    {/* Add Card Button for Custom Sets */}
                    {isCustomSet && (
                        <div className="mb-6">
                            <button
                                onClick={() => setShowAddCard(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pokemon-purple/20 border border-pokemon-purple/30 hover:bg-pokemon-purple/30 text-pokemon-purple font-medium text-sm transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                Add Cards from Official Sets
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                        {displayCards.map((card, index) => {
                            const isSelected = selectedCardIds.has(card.id);
                            return (
                                <motion.div
                                    key={`${currentSet.id}-${card.id}-${index}-${card.variation || 'default'}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: Math.min(index * 0.01, 0.5) }}
                                    className={`relative aspect-[2.5/3.5] group cursor-pointer ${isSelectMode && isSelected ? 'ring-2 ring-pokemon-purple ring-offset-2 ring-offset-slate-900 rounded-lg' : ''}`}
                                    onClick={() => {
                                        if (isSelectMode) {
                                            toggleCardSelection(card.id);
                                        } else {
                                            setPreviewCard(card);
                                        }
                                    }}
                                >
                                    <div className={`absolute inset-0 rounded-lg border overflow-hidden transition-all duration-300 ${card.variation === 'Reverse'
                                        ? 'bg-gradient-to-br from-pokemon-blue/20 to-pokemon-red/20 border-pokemon-blue/30 shadow-[0_0_15px_-5px_rgba(59,76,202,0.5)]'
                                        : 'bg-white/5 border-white/10 group-hover:border-pokemon-yellow/50'
                                        }`}>
                                        {card.images.small ? (
                                            <img
                                                src={card.images.small}
                                                alt={card.name}
                                                className={`w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105 ${card.variation === 'Reverse' ? 'filter saturate-[1.2] brightness-[1.1]' : ''
                                                    }`}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center p-3">
                                                <div className="text-center">
                                                    <div className="text-2xl mb-1">🃏</div>
                                                    <div className="text-xs font-bold text-white truncate">{card.name}</div>
                                                    <div className="text-[10px] text-slate-400">#{card.number}</div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Selection checkbox - visible in select mode */}
                                        {isSelectMode && (
                                            <div className="absolute top-1 left-1 z-10">
                                                {isSelected ? (
                                                    <div className="w-6 h-6 rounded bg-pokemon-purple flex items-center justify-center shadow-lg">
                                                        <CheckSquare className="w-4 h-4 text-white" />
                                                    </div>
                                                ) : (
                                                    <div className="w-6 h-6 rounded bg-black/60 border border-white/30 flex items-center justify-center">
                                                        <Square className="w-4 h-4 text-white/60" />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* View button - only appears on hover when NOT in select mode */}
                                        {!isSelectMode && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPreviewCard(card);
                                                }}
                                                className="absolute top-1 left-1 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="View card"
                                            >
                                                <Eye className="w-3 h-3" />
                                            </button>
                                        )}

                                        {/* Variation Badge */}
                                        {card.variation && card.variation !== 'Normal' && (
                                            <div className={`absolute top-1 right-1 ${isSelectMode ? 'top-8' : ''}`}>
                                                {card.variation === 'Reverse' || card.variation === 'Reverse Holo' ? (
                                                    <div className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter bg-gradient-to-r from-pokemon-blue to-pokemon-red text-white shadow-lg">
                                                        Reverse
                                                    </div>
                                                ) : card.variation === 'Poke Ball Holo' ? (
                                                    <svg className="w-5 h-5 drop-shadow-lg" viewBox="0 0 24 24">
                                                        <path d="M12 12 L12 22 A10 10 0 0 1 2 12 Z" fill="white" />
                                                        <path d="M12 12 L22 12 A10 10 0 0 1 12 22 Z" fill="white" />
                                                        <path d="M12 12 L12 2 A10 10 0 0 1 22 12 Z" fill="#EF4444" />
                                                        <path d="M12 12 L2 12 A10 10 0 0 1 12 2 Z" fill="#EF4444" />
                                                        <rect x="2" y="10.5" width="20" height="3" fill="#1F2937" />
                                                        <circle cx="12" cy="12" r="4" fill="white" stroke="#1F2937" strokeWidth="2" />
                                                        <circle cx="12" cy="12" r="2" fill="#E5E7EB" />
                                                        <circle cx="12" cy="12" r="10" fill="none" stroke="#1F2937" strokeWidth="1.5" />
                                                    </svg>
                                                ) : card.variation === 'Master Ball Holo' ? (
                                                    <svg className="w-5 h-5 drop-shadow-lg" viewBox="0 0 24 24">
                                                        <path d="M12 12 L12 22 A10 10 0 0 1 2 12 Z" fill="white" />
                                                        <path d="M12 12 L22 12 A10 10 0 0 1 12 22 Z" fill="white" />
                                                        <path d="M12 12 L12 2 A10 10 0 0 1 22 12 Z" fill="#8B5CF6" />
                                                        <path d="M12 12 L2 12 A10 10 0 0 1 12 2 Z" fill="#8B5CF6" />
                                                        <circle cx="12" cy="6" r="2.5" fill="#EC4899" />
                                                        <path d="M6 4 L8 8" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" />
                                                        <path d="M18 4 L16 8" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" />
                                                        <rect x="2" y="10.5" width="20" height="3" fill="#1F2937" />
                                                        <circle cx="12" cy="12" r="4" fill="white" stroke="#1F2937" strokeWidth="2" />
                                                        <circle cx="12" cy="12" r="2" fill="#E5E7EB" />
                                                        <circle cx="12" cy="12" r="10" fill="none" stroke="#1F2937" strokeWidth="1.5" />
                                                    </svg>
                                                ) : (
                                                    <div className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter bg-slate-600 text-white shadow-lg">
                                                        {card.variation.slice(0, 3)}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Delete button for custom cards - only when NOT in select mode */}
                                        {isCustomSet && !isSelectMode && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCardToDelete(card);
                                                }}
                                                className="absolute top-1 right-1 p-1 rounded bg-red-500/80 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Remove card"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}

                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 pointer-events-none">
                                            <p className="text-[10px] font-bold text-white truncate">{card.name}</p>
                                            <p className="text-[8px] text-slate-300">{card.number} / {set.printedTotal || cards.length}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Floating Action Bar for Selection Mode */}
            {isSelectMode && (
                <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 100 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-gradient-to-r from-slate-800 to-slate-900 border border-white/10 rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4"
                >
                    <div className="flex items-center gap-2 text-white">
                        <CheckSquare className="w-5 h-5 text-pokemon-purple" />
                        <span className="font-semibold">{selectedCardIds.size}</span>
                        <span className="text-slate-400">selected</span>
                    </div>

                    <div className="w-px h-8 bg-white/10" />

                    {selectedCardIds.size === displayCards.length ? (
                        <button
                            onClick={deselectAllCards}
                            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all"
                        >
                            Deselect All
                        </button>
                    ) : (
                        <button
                            onClick={selectAllCards}
                            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all"
                        >
                            Select All
                        </button>
                    )}

                    <button
                        onClick={() => setShowBulkDeleteConfirm(true)}
                        disabled={selectedCardIds.size === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${selectedCardIds.size > 0
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-red-500/30 text-red-400/50 cursor-not-allowed'
                            }`}
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete Selected
                    </button>
                </motion.div>
            )}

            {/* Bulk Delete Confirmation Modal */}
            {showBulkDeleteConfirm && (
                <div
                    className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setShowBulkDeleteConfirm(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gradient-to-br from-slate-900 to-slate-950 border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center">
                            {/* Warning icon */}
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                                <Trash2 className="w-8 h-8 text-red-500" />
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">Delete {selectedCardIds.size} Cards?</h3>

                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                                <p className="text-red-400 text-sm font-medium mb-2">
                                    ⚠️ This action cannot be undone
                                </p>
                                <p className="text-slate-400 text-sm">
                                    The selected cards will be permanently removed from your custom set.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowBulkDeleteConfirm(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmBulkDelete}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-all"
                                >
                                    Delete {selectedCardIds.size} Cards
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Add Card Modal for Custom Sets */}
            {isCustomSet && (
                <AddCardModal
                    isOpen={showAddCard}
                    onClose={() => setShowAddCard(false)}
                    setId={set.id}
                    onCardAdded={refreshCards}
                />
            )}

            {/* Card Preview Modal */}
            <CardPreviewModal
                card={previewCard}
                isOpen={!!previewCard}
                onClose={() => setPreviewCard(null)}
                customSetId={isCustomSet ? set.id : undefined}
                onAdd={handleAddCard}
                onRemove={handleRemoveCard}
                onVariantAdded={() => {
                    refreshCards();
                    // Keep modal open so user can add more variants
                }}
                existingVariations={
                    previewCard
                        ? cards
                            .filter(c => c.number === previewCard.number)
                            .map(c => c.variation || 'Normal')
                        : []
                }
            />

            {/* Delete Confirmation Modal */}
            {cardToDelete && (
                <div
                    className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setCardToDelete(null)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center">
                            {/* Card thumbnail */}
                            <div className="w-20 h-28 mx-auto mb-4 rounded-lg overflow-hidden border border-white/20">
                                {cardToDelete.images.small ? (
                                    <img
                                        src={cardToDelete.images.small}
                                        alt={cardToDelete.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                        <span className="text-2xl">🃏</span>
                                    </div>
                                )}
                            </div>

                            <h3 className="text-lg font-bold text-white mb-2">Remove Card?</h3>
                            <p className="text-slate-400 text-sm mb-6">
                                Are you sure you want to remove <span className="text-white font-medium">{cardToDelete.name}</span> from your collection?
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setCardToDelete(null)}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDeleteCard}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-all"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Delete Set Confirmation Modal */}
            {showDeleteSetConfirm && (
                <div
                    className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setShowDeleteSetConfirm(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gradient-to-br from-slate-900 to-slate-950 border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center">
                            {/* Warning icon */}
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">Delete "{set.name}"?</h3>

                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                                <p className="text-red-400 text-sm font-medium mb-2">
                                    ⚠️ This action is IRREVERSIBLE
                                </p>
                                <p className="text-slate-400 text-sm">
                                    All {cards.length} card(s) in this set will be permanently deleted.
                                    This cannot be undone.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteSetConfirm(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        deleteCustomSet(set.id);
                                        onBack(); // Navigate back to set list
                                    }}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-all"
                                >
                                    Delete Forever
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
            {/* Edit Set Modal */}
            {isCustomSet && (
                <EditCustomSetModal
                    isOpen={showEditSet}
                    onClose={() => setShowEditSet(false)}
                    set={currentSet as any}
                    onUpdated={(updatedSet) => {
                        setCurrentSet(updatedSet);
                        refreshCustomSets();
                    }}
                />
            )}

            {/* Create Custom Set Confirmation Modal */}
            {showCreateConfirm && (
                <div
                    className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setShowCreateConfirm(false)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gradient-to-br from-slate-900 to-slate-950 border border-pokemon-purple/30 rounded-2xl p-6 max-w-md w-full shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center">
                            {/* Copy icon */}
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pokemon-purple/20 flex items-center justify-center">
                                <Copy className="w-8 h-8 text-pokemon-purple" />
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">Create Custom Set?</h3>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-left">
                                <p className="text-white font-medium mb-2">This will create:</p>
                                <p className="text-slate-400 text-sm mb-3">
                                    "{currentSet.name} (Custom)" with {cards.length} cards copied from this set.
                                </p>
                                <p className="text-slate-400 text-sm">
                                    You can then add variant cards (Reverse Holo, Poke Ball Holo, Master Ball Holo) to track your complete master set collection.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCreateConfirm(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCreateConfirm(false);

                                        // Create the custom set
                                        const customSet = createCustomSet(
                                            `${currentSet.name} (Custom)`,
                                            currentSet.series
                                        );

                                        // Copy all cards from the current set to the new custom set
                                        const displayedCards = getFilteredCards();
                                        displayedCards.forEach(card => {
                                            addCustomCard(
                                                customSet.id,
                                                card.name,
                                                card.number,
                                                card.rarity || 'Common',
                                                card.images.small,
                                                card,
                                                'Normal'
                                            );
                                        });

                                        refreshCustomSets();
                                        // Show success modal
                                        setCreatedCustomSet({
                                            ...customSet,
                                            total: displayedCards.length,
                                            isCustom: true
                                        });
                                    }}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-pokemon-purple hover:bg-pokemon-purple/80 text-white font-semibold transition-all"
                                >
                                    Proceed
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Custom Set Created Success Modal */}
            <SuccessModal
                isOpen={!!createdCustomSet}
                onClose={() => setCreatedCustomSet(null)}
                title="Custom Set Created!"
                subtitle={createdCustomSet?.name}
                description={`${createdCustomSet?.total || 0} cards copied. You can now add variant cards (Reverse Holo, Poke Ball Holo, Master Ball Holo) to track your complete collection.`}
                accentColor="green"
                secondaryAction={{
                    label: "Stay Here",
                    onClick: () => setCreatedCustomSet(null),
                }}
                primaryAction={{
                    label: "Go to Custom Set",
                    onClick: () => {
                        if (onNavigateToSet && createdCustomSet) {
                            onNavigateToSet(createdCustomSet);
                        }
                        setCreatedCustomSet(null);
                    },
                }}
            />

            {/* Share Set Modal */}
            <ShareSetModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                shareUrl={shareUrl}
                setName={currentSet.name}
            />
        </div>
    );
};

export default SetDetail;
