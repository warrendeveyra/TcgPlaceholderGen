import React, { useEffect, useState, useMemo } from 'react';
import { PokemonCard, PokemonSet } from '../types/pokemon';
import { pokemonTcgApi } from '../services/pokemonTcgApi';
import { getCustomCardsBySet, deleteCustomCard, deleteCustomCards, deleteCustomSet, createCustomSet, addCustomCard, addCustomCardsBulk, CustomSet } from '../services/customSets';
import { ArrowLeft, Loader2, Printer, Plus, Trash2, Copy, Share2, CheckSquare, AlertTriangle, Pencil, ChevronDown, Info, FolderPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PrintView from './PrintView';
import BinderCalculator from './BinderCalculator';
import AddCardModal from './AddCardModal';
import CardPreviewModal from './CardPreviewModal';
import EditCustomSetModal from './EditCustomSetModal';
import SuccessModal from './SuccessModal';
import ShareSetModal from './ShareSetModal';
import BulkAddModal from './BulkAddModal';
import GridCard from './GridCard';
import { shareCustomSet } from '../services/shareService';
import { useSetContext } from '../context/SetContext';
import { hasSpecialVariants, getSetVariants } from '../utils/variantOverrides';

interface SetDetailProps {
    set: PokemonSet & { isCustom?: boolean };
    onBack: () => void;
    onNavigateToSet?: (set: PokemonSet & { isCustom?: boolean }) => void;
}

const SetDetail: React.FC<SetDetailProps> = ({ set, onBack, onNavigateToSet }) => {
    const [cards, setCards] = useState<PokemonCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showPrintView, setShowPrintView] = useState(false);
    const [showAddCard, setShowAddCard] = useState(false);
    const [previewCard, setPreviewCard] = useState<PokemonCard | null>(null);
    const [showDeleteSetConfirm, setShowDeleteSetConfirm] = useState(false);
    const [showEditSet, setShowEditSet] = useState(false);
    const [currentSet, setCurrentSet] = useState(set);
    const [createdCustomSet, setCreatedCustomSet] = useState<(PokemonSet & { isCustom?: boolean }) | null>(null);
    const [showCreateConfirm, setShowCreateConfirm] = useState(false);
    const [createMode, setCreateMode] = useState<'standard' | 'master'>('standard');
    const [showBulkAdd, setShowBulkAdd] = useState(false);

    // Selection mode state
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    // Share state
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [isSharing, setIsSharing] = useState(false);

    const [viewMode, setViewMode] = useState<'standard' | 'master'>('standard');
    const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
    const [showFullArts, setShowFullArts] = useState(true);

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

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (viewDropdownOpen && !target.closest('[data-view-dropdown]')) {
                setViewDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [viewDropdownOpen]);

    useEffect(() => {
        const fetchCards = async () => {
            try {
                setLoading(true);
                let loadedCards: PokemonCard[] = [];
                if (set.isCustom) {
                    loadedCards = getCustomCardsBySet(set.id);
                } else {
                    const response = await pokemonTcgApi.getCardsBySet(set.id);
                    loadedCards = response.data;
                }

                setCards(loadedCards);
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
            variation
        );
        refreshCards();
    };

    const handleRemoveCard = (card: PokemonCard) => {
        // Find the specific card with this number and variation
        const target = cards.find(c =>
            c.number === card.number &&
            (c.variation || 'Normal') === (card.variation || 'Normal')
        );
        if (target) {
            deleteCustomCard(target.id);
            refreshCards();
        }
    };

    const toggleCardSelection = (cardId: string) => {
        const newSelection = new Set(selectedCardIds);
        if (newSelection.has(cardId)) {
            newSelection.delete(cardId);
        } else {
            newSelection.add(cardId);
        }
        setSelectedCardIds(newSelection);
    };

    const selectAllCards = () => {
        setSelectedCardIds(new Set(displayCards.map(c => c.id)));
    };

    const deselectAllCards = () => {
        setSelectedCardIds(new Set());
    };

    const confirmBulkDelete = () => {
        deleteCustomCards(Array.from(selectedCardIds));
        setSelectedCardIds(new Set());
        setShowBulkDeleteConfirm(false);
        setIsSelectMode(false);
        refreshCards();
    };

    const handleShareSet = async () => {
        try {
            setIsSharing(true);
            const result = await shareCustomSet(currentSet, cards);
            if (result.success && result.shareUrl) {
                setShareUrl(result.shareUrl);
                setShowShareModal(true);
            } else {
                throw new Error(result.error || 'Failed to generate share link');
            }
        } catch (err) {
            console.error('Failed to share set:', err);
            alert('Failed to generate share link. Please try again.');
        } finally {
            setIsSharing(false);
        }
    };

    // Calculate release year for variant eligibility
    const releaseYear = currentSet.releaseDate ? parseInt(currentSet.releaseDate.split('-')[0]) : 0;
    const canHaveMasterSet = !isCustomSet && releaseYear >= 2002;
    const isSpecialSet = hasSpecialVariants(currentSet.id);

    // Master set expansion: add variant cards based on set rules
    const masterSetCards = useMemo(() => {
        if (!canHaveMasterSet) return cards;

        const expandedCards: PokemonCard[] = [];

        cards.forEach(card => {
            // Add the base (Normal) card
            expandedCards.push({ ...card, variation: 'Normal' });

            // Get variants for this specific card
            const variants = getSetVariants(
                currentSet.id,
                card.supertype,
                releaseYear,
                card.subtypes,
                card.name,
                card.id,
                currentSet.printedTotal
            );

            // Add variant cards
            variants.forEach(variant => {
                expandedCards.push({
                    ...card,
                    id: `${card.id}-${variant.toLowerCase().replace(/\s+/g, '-')}`,
                    variation: variant,
                });
            });
        });

        return expandedCards;
    }, [cards, canHaveMasterSet, currentSet.id, releaseYear]);

    const getFilteredCards = () => {
        // Use master set cards if in master mode, otherwise base cards
        let baseCards = (!isCustomSet && viewMode === 'master') ? [...masterSetCards] : [...cards];

        // Apply Full Arts filter for official sets
        if (!isCustomSet && !showFullArts && currentSet.printedTotal > 0) {
            baseCards = baseCards.filter(card => {
                const num = parseInt(card.number.replace(/\D/g, '')) || 0;
                return num <= currentSet.printedTotal;
            });
        }

        const variationOrder: Record<string, number> = {
            'Normal': 0,
            'Reverse Holo': 1,
            'Poke Ball Holo': 2,
            'Master Ball Holo': 3,
        };

        return baseCards.sort((a, b) => {
            const numA = parseInt(a.number.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.number.replace(/\D/g, '')) || 0;

            if (numA !== numB) {
                return numA - numB;
            }

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
                            <h2 className="text-3xl font-bold text-white tracking-tight">{currentSet.name}</h2>
                            {isCustomSet && (
                                <button
                                    onClick={() => setShowEditSet(true)}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                    title="Edit Set Name"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <p className="text-slate-400 font-medium">
                            {currentSet.series} • {displayCards.length} {displayCards.length === 1 ? 'Card' : 'Cards'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* View Mode Dropdown for Official Sets (2002+) */}
                    {canHaveMasterSet && (
                        <div className="relative" data-view-dropdown>
                            <button
                                onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500/50 font-medium text-sm transition-all"
                            >
                                <span>
                                    {viewMode === 'standard'
                                        ? 'Standard Set'
                                        : isSpecialSet
                                            ? 'Master Set (All Variants)'
                                            : 'Master Set (Reverse Holo)'}
                                </span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${viewDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {viewDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute z-50 top-full mt-2 left-0 min-w-[220px] py-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                                    >
                                        <button
                                            onClick={() => {
                                                setViewMode('standard');
                                                setViewDropdownOpen(false);
                                            }}
                                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between ${viewMode === 'standard'
                                                ? 'bg-pokemon-blue/20 text-pokemon-blue font-bold'
                                                : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                                }`}
                                        >
                                            <div>
                                                <div className="font-medium">Standard Set</div>
                                                <div className="text-xs text-slate-500">{cards.length} cards</div>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setViewMode('master');
                                                setViewDropdownOpen(false);
                                            }}
                                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between ${viewMode === 'master'
                                                ? 'bg-pokemon-purple/20 text-pokemon-purple font-bold'
                                                : 'text-slate-300 hover:bg-white/5 hover:text-white'
                                                }`}
                                        >
                                            <div>
                                                <div className="font-medium">
                                                    {isSpecialSet ? 'Master Set (All Variants)' : 'Master Set (Reverse Holo)'}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {masterSetCards.length} cards
                                                    {isSpecialSet && ' • Includes Poké Ball & Master Ball Holos'}
                                                </div>
                                            </div>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Create Custom Set Button (for official sets) */}
                    {!isCustomSet && (
                        <button
                            onClick={() => setShowCreateConfirm(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-pokemon-purple/30 bg-pokemon-purple/10 hover:bg-pokemon-purple/20 text-pokemon-purple font-medium text-sm transition-all"
                            title="Use this set as a template for a new custom set"
                        >
                            <Copy className="w-4 h-4" />
                            Create Custom Set
                        </button>
                    )}

                    {/* Full Arts Toggle Button (for official sets) */}
                    {!isCustomSet && (
                        <button
                            onClick={() => setShowFullArts(!showFullArts)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-lg ${showFullArts
                                ? 'bg-pokemon-yellow text-slate-900 shadow-pokemon-yellow/20'
                                : 'bg-slate-800/50 border border-slate-600/50 text-slate-400'
                                }`}
                        >
                            Full Arts: {showFullArts ? 'On' : 'Off'}
                        </button>
                    )}

                    {/* Select Mode Toggle */}
                    <button
                        onClick={() => {
                            setIsSelectMode(!isSelectMode);
                            if (isSelectMode) setSelectedCardIds(new Set());
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-medium text-sm ${isSelectMode
                            ? 'bg-pokemon-purple text-white border-pokemon-purple shadow-lg shadow-pokemon-purple/20'
                            : 'bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500/50'
                            }`}
                    >
                        <CheckSquare className="w-4 h-4" />
                        {isSelectMode ? 'Cancel Selection' : 'Select'}
                    </button>

                    {/* Share Button for Custom Sets */}
                    {isCustomSet && !isSelectMode && (
                        <button
                            onClick={handleShareSet}
                            disabled={isSharing}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pokemon-blue hover:bg-pokemon-blue/80 text-white font-medium text-sm transition-all shadow-lg shadow-pokemon-blue/20 disabled:opacity-50"
                        >
                            {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                            Share
                        </button>
                    )}

                    {/* Delete Set Button for Custom Sets */}
                    {isCustomSet && !isSelectMode && (
                        <button
                            onClick={() => setShowDeleteSetConfirm(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium text-sm transition-all shadow-lg shadow-red-500/20"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Set
                        </button>
                    )}

                    <button
                        onClick={() => setShowPrintView(true)}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-pokemon-blue hover:bg-pokemon-blue/90 text-white font-bold text-sm transition-all shadow-lg shadow-pokemon-blue/20"
                    >
                        <Printer className="w-4 h-4" />
                        Print
                    </button>
                </div>
            </header>

            <BinderCalculator totalCards={displayCards.length} />

            {/* Standard Reverse Holo Set Info Banner */}
            {!isCustomSet && canHaveMasterSet && viewMode === 'master' && (
                <div className="mb-6 mx-auto">
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-border-slate-700/50 flex items-start gap-3">
                        <Info className="w-5 h-5 text-pokemon-blue mt-0.5" />
                        <div>
                            <p className="text-white font-bold text-sm mb-1">Master Set Information</p>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                This set contains {isSpecialSet ? (
                                    <><span className="text-pokemon-purple font-medium">Reverse Holo</span>, <span className="text-pokemon-blue font-medium">Poké Ball Holo</span>, and <span className="text-pokemon-yellow font-medium">Master Ball Holo</span></>
                                ) : (
                                    <span className="text-pokemon-purple font-medium">Reverse Holo</span>
                                )} variants for most cards.
                            </p>
                            <p className="text-amber-400 text-xs mt-2 font-medium flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>This master set is auto-generated and may not be 100% accurate. Please use caution and verify with official sources before printing.</span>
                            </p>
                            <p className="text-slate-500 text-xs mt-2 font-medium">
                                To track your collection, use "Create Custom Set" to copy these cards into a personal set.
                            </p>
                        </div>
                    </div>
                </div>
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
                        {displayCards.map((card, index) => (
                            <GridCard
                                key={`${currentSet.id}-${card.id}-${index}-${card.variation || 'default'}`}
                                card={card}
                                index={index}
                                isSelectMode={isSelectMode}
                                isSelected={selectedCardIds.has(card.id)}
                                isCustomSet={isCustomSet}
                                onClick={() => {
                                    if (isSelectMode) {
                                        toggleCardSelection(card.id);
                                    } else {
                                        setPreviewCard(card);
                                    }
                                }}
                                onDelete={(c) => setCardToDelete(c)}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* Floating Action Bar for Selection Mode */}
            <AnimatePresence>
                {isSelectMode && (
                    <div className="fixed inset-x-0 bottom-6 z-[100] flex justify-center pointer-events-none px-4">
                        <motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            className="pointer-events-auto bg-slate-900/95 border border-white/10 backdrop-blur-md rounded-2xl shadow-2xl px-2.5 py-2 sm:px-6 sm:py-4 flex items-center gap-1.5 sm:gap-4 w-auto max-w-full"
                        >
                            <div className="flex items-center gap-1 sm:gap-2 text-white whitespace-nowrap">
                                <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-pokemon-purple" />
                                <span className="font-semibold text-xs sm:text-base">{selectedCardIds.size}</span>
                                <span className="text-slate-400 text-[10px] sm:text-base ml-0.5">selected</span>
                            </div>

                            <div className="w-px h-5 sm:h-8 bg-white/10" />

                            <div className="flex gap-1 sm:gap-2">
                                {selectedCardIds.size === displayCards.length ? (
                                    <button
                                        onClick={deselectAllCards}
                                        className="px-2 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap"
                                    >
                                        Deselect <span className="hidden xs:inline">All</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={selectAllCards}
                                        className="px-2 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap"
                                    >
                                        Select <span className="hidden xs:inline">All</span>
                                    </button>
                                )}

                                {isCustomSet ? (
                                    <button
                                        onClick={() => setShowBulkDeleteConfirm(true)}
                                        disabled={selectedCardIds.size === 0}
                                        className={`flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-sm font-semibold transition-all whitespace-nowrap ${selectedCardIds.size > 0
                                            ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                                            : 'bg-red-500/20 text-red-400/50 cursor-not-allowed border border-red-500/10'
                                            }`}
                                    >
                                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        <span className="hidden xs:inline">Delete Selected</span>
                                        <span className="xs:hidden">Delete</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setShowBulkAdd(true)}
                                        disabled={selectedCardIds.size === 0}
                                        className={`flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-sm font-semibold transition-all whitespace-nowrap ${selectedCardIds.size > 0
                                            ? 'bg-pokemon-blue hover:bg-pokemon-blue/90 text-white shadow-lg shadow-pokemon-blue/20'
                                            : 'bg-pokemon-blue/20 text-pokemon-blue/50 cursor-not-allowed border border-pokemon-blue/10'
                                            }`}
                                    >
                                        <FolderPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        <span className="hidden xs:inline">Add to Custom Set</span>
                                        <span className="xs:hidden">Add</span>
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modals */}
            <AddCardModal
                isOpen={showAddCard}
                onClose={() => setShowAddCard(false)}
                setId={currentSet.id}
                onCardAdded={refreshCards}
            />

            <BulkAddModal
                isOpen={showBulkAdd}
                onClose={() => setShowBulkAdd(false)}
                selectedCards={displayCards.filter(c => selectedCardIds.has(c.id))}
                onSuccess={() => {
                    setIsSelectMode(false);
                    setSelectedCardIds(new Set());
                    refreshCustomSets();
                }}
            />

            <CardPreviewModal
                card={previewCard}
                isOpen={!!previewCard}
                onClose={() => setPreviewCard(null)}
                onAdd={(card: PokemonCard, variation?: string) => {
                    handleAddCard(card, variation);
                }}
                onRemove={(card: PokemonCard) => {
                    handleRemoveCard(card);
                }}
                customSetId={isCustomSet ? currentSet.id : undefined}
                onVariantAdded={refreshCards}
                existingVariations={isCustomSet && previewCard ?
                    cards.filter(c => c.number === previewCard.number).map(c => c.variation || 'Normal')
                    : []}
            />

            {isCustomSet && (
                <EditCustomSetModal
                    isOpen={showEditSet}
                    onClose={() => setShowEditSet(false)}
                    set={currentSet as CustomSet}
                    onUpdated={(updatedSet: CustomSet) => {
                        setCurrentSet(updatedSet);
                        refreshCustomSets();
                    }}
                />
            )}

            {/* Delete Set Confirmation Modal */}
            <AnimatePresence>
                {showDeleteSetConfirm && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-sm w-full shadow-2xl"
                        >
                            <div className="text-center">
                                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">Delete Custom Set?</h3>
                                <p className="text-slate-400 mb-6">Are you sure you want to delete <span className="text-white font-medium">{currentSet.name}</span>? This action cannot be undone.</p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowDeleteSetConfirm(false)}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            deleteCustomSet(currentSet.id);
                                            onBack();
                                        }}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-all shadow-lg shadow-red-500/20"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Card Confirmation Modal */}
            <AnimatePresence>
                {cardToDelete && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                        >
                            <h3 className="text-xl font-bold text-white mb-2">Remove Card?</h3>
                            <p className="text-slate-400 mb-6">Are you sure you want to remove <span className="text-white font-medium">{cardToDelete.name}</span> from the set?</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setCardToDelete(null)}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDeleteCard}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-all shadow-lg shadow-red-500/20"
                                >
                                    Remove
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Bulk Delete Confirmation Modal */}
            <AnimatePresence>
                {showBulkDeleteConfirm && (
                    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl"
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <Trash2 className="w-8 h-8 text-red-500" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Delete {selectedCardIds.size} Cards?</h3>
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                                    <p className="text-red-400 text-sm font-medium mb-1">⚠️ This action cannot be undone</p>
                                    <p className="text-slate-400 text-sm">The selected cards will be permanently removed from your custom set.</p>
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
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-all shadow-lg shadow-red-500/20"
                                    >
                                        Delete All
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create Custom Set Modal */}
            <AnimatePresence>
                {showCreateConfirm && (
                    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
                        >
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pokemon-blue/20 flex items-center justify-center">
                                    <Plus className="w-8 h-8 text-pokemon-blue" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Create Custom Set</h3>
                                <p className="text-slate-400">Choose how to create your custom set from <span className="text-white font-medium">{currentSet.name}</span></p>
                            </div>

                            {/* Selection Options */}
                            <div className="space-y-3 mb-6">
                                {/* Standard Set Option */}
                                <button
                                    onClick={() => setCreateMode('standard')}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${createMode === 'standard'
                                        ? 'border-pokemon-blue bg-pokemon-blue/10'
                                        : 'border-white/10 hover:border-white/20 bg-white/5'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-semibold text-white">Standard Set</div>
                                            <div className="text-sm text-slate-400">{cards.length} base cards only</div>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${createMode === 'standard' ? 'border-pokemon-blue bg-pokemon-blue' : 'border-slate-500'
                                            }`}>
                                            {createMode === 'standard' && <div className="w-2 h-2 rounded-full bg-white" />}
                                        </div>
                                    </div>
                                </button>

                                {/* Master Set Option - only for 2002+ sets */}
                                {canHaveMasterSet && (
                                    <button
                                        onClick={() => setCreateMode('master')}
                                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${createMode === 'master'
                                            ? 'border-pokemon-purple bg-pokemon-purple/10'
                                            : 'border-white/10 hover:border-white/20 bg-white/5'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-semibold text-white">
                                                    {isSpecialSet ? 'Master Set (All Variants)' : 'Master Set (Reverse Holo)'}
                                                </div>
                                                <div className="text-sm text-slate-400">
                                                    {masterSetCards.length} cards including variants
                                                </div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${createMode === 'master' ? 'border-pokemon-purple bg-pokemon-purple' : 'border-slate-500'
                                                }`}>
                                                {createMode === 'master' && <div className="w-2 h-2 rounded-full bg-white" />}
                                            </div>
                                        </div>
                                    </button>
                                )}
                            </div>

                            {/* Disclaimer for Master Set */}
                            {createMode === 'master' && canHaveMasterSet && (
                                <div className="mb-6 px-4">
                                    <div className="flex gap-3">
                                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm">
                                            <p className="text-amber-200 font-bold mb-1">Master Set Accuracy</p>
                                            <p className="text-slate-300 mb-2 font-medium leading-relaxed">
                                                This master set is auto-generated and may not be 100% accurate. Please be cautious and verify all variants against official sources before printing.
                                            </p>
                                            <p className="text-slate-500 text-xs">
                                                {isSpecialSet
                                                    ? "Includes Reverse Holo, Poké Ball Holo, and Master Ball Holo variants."
                                                    : "Includes Reverse Holo variants for most Pokémon and Trainer cards."
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowCreateConfirm(false);
                                        setCreateMode('standard');
                                    }}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        const suffix = createMode === 'master' ? 'Master Set' : 'Custom';
                                        const customSet = createCustomSet(`${currentSet.name} (${suffix})`, currentSet.series);

                                        // Copy cards based on selected mode
                                        const cardsToAdd = createMode === 'master' ? masterSetCards : cards;

                                        // Use bulk addition for better performance
                                        addCustomCardsBulk(
                                            customSet.id,
                                            cardsToAdd.map(card => ({
                                                name: card.name,
                                                number: card.number,
                                                rarity: card.rarity || 'Common',
                                                imageUrl: card.images.small,
                                                sourceCard: card,
                                                variation: card.variation
                                            }))
                                        );

                                        refreshCustomSets();
                                        setShowCreateConfirm(false);
                                        setCreateMode('standard');
                                        setCreatedCustomSet({
                                            ...customSet,
                                            total: cardsToAdd.length,
                                            isCustom: true
                                        });
                                    }}
                                    className={`flex-1 px-4 py-2.5 rounded-xl font-semibold transition-all ${createMode === 'master'
                                        ? 'bg-pokemon-purple hover:bg-pokemon-purple/80 text-white'
                                        : 'bg-pokemon-blue hover:bg-pokemon-blue/80 text-white'
                                        }`}
                                >
                                    Create {createMode === 'master' ? 'Master Set' : 'Custom Set'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
