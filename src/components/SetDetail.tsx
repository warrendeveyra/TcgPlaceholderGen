import React, { useEffect, useState } from 'react';
import { PokemonCard, PokemonSet } from '../types/pokemon';
import { pokemonTcgApi } from '../services/pokemonTcgApi';
import { getCustomCardsBySet, deleteCustomCard, deleteCustomCards, deleteCustomSet, createCustomSet, addCustomCard, CustomSet } from '../services/customSets';
import { ArrowLeft, Loader2, Printer, Plus, Trash2, Info, Copy, Share2, CheckSquare, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PrintView from './PrintView';
import BinderCalculator from './BinderCalculator';
import AddCardModal from './AddCardModal';
import CardPreviewModal from './CardPreviewModal';
import EditCustomSetModal from './EditCustomSetModal';
import SuccessModal from './SuccessModal';
import ShareSetModal from './ShareSetModal';
import GridCard from './GridCard';
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
                let loadedCards: PokemonCard[] = [];
                if (set.isCustom) {
                    loadedCards = getCustomCardsBySet(set.id);
                } else {
                    const response = await pokemonTcgApi.getCardsBySet(set.id);
                    loadedCards = response.data;
                }

                // Memory Optimization: Prune redundant set data from each card
                const prunedCards = loadedCards.map(card => ({
                    ...card,
                    set: { id: card.set.id } as any // Keep only ID, we have set info in currentSet
                }));

                setCards(prunedCards);
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

    const getFilteredCards = () => {
        let baseCards = [...cards];

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
                                <span className="px-2 py-0.5 rounded-full bg-pokemon-purple/20 border border-pokemon-purple/30 text-pokemon-purple text-[10px] font-bold uppercase tracking-wider">
                                    Custom Set
                                </span>
                            )}
                        </div>
                        <p className="text-slate-400 font-medium">
                            {currentSet.series} • {displayCards.length} {displayCards.length === 1 ? 'Card' : 'Cards'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Select Mode Toggle */}
                    {isCustomSet && (
                        <button
                            onClick={() => {
                                setIsSelectMode(!isSelectMode);
                                if (isSelectMode) setSelectedCardIds(new Set());
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-medium text-sm ${isSelectMode
                                ? 'bg-pokemon-purple text-white border-pokemon-purple shadow-lg shadow-pokemon-purple/20'
                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                }`}
                        >
                            <CheckSquare className="w-4 h-4" />
                            {isSelectMode ? 'Cancel Selection' : 'Select'}
                        </button>
                    )}

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

                    <button
                        onClick={() => setShowPrintView(true)}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-pokemon-yellow hover:bg-pokemon-yellow/90 text-slate-900 font-bold text-sm transition-all shadow-lg shadow-pokemon-yellow/20"
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

                    {!isCustomSet && (
                        <div className="mb-6 flex justify-end">
                            <button
                                onClick={() => setShowCreateConfirm(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pokemon-blue/20 border border-pokemon-blue/30 hover:bg-pokemon-blue/30 text-pokemon-blue font-medium text-sm transition-all"
                                title="Use this set as a template for a new custom set"
                            >
                                <Copy className="w-4 h-4" />
                                Create Custom Set from Template
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
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/90 border border-white/10 backdrop-blur-md rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4"
                    >
                        <div className="flex items-center gap-2 text-white">
                            <CheckSquare className="w-5 h-5 text-pokemon-purple" />
                            <span className="font-semibold">{selectedCardIds.size}</span>
                            <span className="text-slate-400">selected</span>
                        </div>

                        <div className="w-px h-8 bg-white/10" />

                        <div className="flex gap-2">
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
                                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                                    : 'bg-red-500/20 text-red-400/50 cursor-not-allowed border border-red-500/10'
                                    }`}
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Selected
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modals */}
            <AddCardModal
                isOpen={showAddCard}
                onClose={() => setShowAddCard(false)}
                setId={currentSet.id}
                onCardAdded={refreshCards}
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
                            className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pokemon-blue/20 flex items-center justify-center">
                                    <Plus className="w-8 h-8 text-pokemon-blue" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Create Custom Set?</h3>
                                <p className="text-slate-400 mb-6">This will create a new custom set based on <span className="text-white font-medium">{currentSet.name}</span>. You can then add specific variants like Reverse Holos.</p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowCreateConfirm(false)}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            const customSet = createCustomSet(`${currentSet.name} (Custom)`, currentSet.series);
                                            // Copy all cards
                                            cards.forEach(card => {
                                                addCustomCard(customSet.id, card.name, card.number, card.rarity || 'Common', card.images.small, card);
                                            });
                                            refreshCustomSets();
                                            setShowCreateConfirm(false);
                                            setCreatedCustomSet({
                                                ...customSet,
                                                total: cards.length,
                                                isCustom: true
                                            });
                                        }}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-pokemon-blue hover:bg-pokemon-blue/80 text-white font-semibold transition-all"
                                    >
                                        Proceed
                                    </button>
                                </div>
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
