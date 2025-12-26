import React, { useEffect, useState } from 'react';
import { PokemonCard, PokemonSet } from '../types/pokemon';
import { pokemonTcgApi } from '../services/pokemonTcgApi';
import { getCustomCardsBySet, deleteCustomCard, deleteCustomSet } from '../services/customSets';
import { ArrowLeft, Loader2, Printer, Plus, Trash2, Eye, AlertTriangle, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';
import PrintView from './PrintView';
import BinderCalculator from './BinderCalculator';
import AddCardModal from './AddCardModal';
import CardPreviewModal from './CardPreviewModal';
import EditCustomSetModal from './EditCustomSetModal';
import CustomDropdown from './CustomDropdown';
import { isReverseHoloEligible } from '../utils/pokemonUtils';
import { useSetContext } from '../context/SetContext';

interface SetDetailProps {
    set: PokemonSet & { isCustom?: boolean };
    onBack: () => void;
}

const SetDetail: React.FC<SetDetailProps> = ({ set, onBack }) => {
    const [cards, setCards] = useState<PokemonCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterMode, setFilterMode] = useState<'standard' | 'master-mixed'>('standard');
    const [includeFullArts, setIncludeFullArts] = useState(true);
    const [showPrintView, setShowPrintView] = useState(false);
    const [showAddCard, setShowAddCard] = useState(false);
    const [previewCard, setPreviewCard] = useState<PokemonCard | null>(null);
    const [showDeleteSetConfirm, setShowDeleteSetConfirm] = useState(false);
    const [showEditSet, setShowEditSet] = useState(false);
    const [currentSet, setCurrentSet] = useState(set);

    const { refreshCustomSets } = useSetContext();

    const isCustomSet = !!currentSet.isCustom;

    // Keep local set in sync if prop changes
    useEffect(() => {
        setCurrentSet(set);
    }, [set]);

    const refreshCards = () => {
        if (isCustomSet) {
            setCards(getCustomCardsBySet(set.id));
        }
    };

    useEffect(() => {
        const fetchCards = async () => {
            try {
                setLoading(true);
                if (isCustomSet) {
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
    }, [set.id, isCustomSet]);

    const [cardToDelete, setCardToDelete] = useState<PokemonCard | null>(null);

    const confirmDeleteCard = () => {
        if (cardToDelete) {
            deleteCustomCard(cardToDelete.id);
            setCards(getCustomCardsBySet(set.id));
            setCardToDelete(null);
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

        if (filterMode === 'standard') {
            return baseCards;
        }

        if (filterMode === 'master-mixed') {
            const mixed: PokemonCard[] = [];

            if (isCustomSet) {
                // For custom sets, respect manual entries but fill gaps if needed
                const hasManualReverse = new Set(
                    baseCards.filter(c => c.variation === 'Reverse').map(c => `${c.set.id}-${c.number}`)
                );

                baseCards.forEach(card => {
                    const cardKey = `${card.set.id}-${card.number}`;

                    if (card.variation === 'Reverse') {
                        mixed.push(card);
                    } else {
                        // Push normal version
                        mixed.push({ ...card, variation: 'Normal' });

                        // Add reverse ONLY if it wasn't already added manually in the list
                        if (isReverseHoloEligible(card) && !hasManualReverse.has(cardKey)) {
                            mixed.push({ ...card, variation: 'Reverse', id: `${card.id}-rev` });
                        }
                    }
                });
            } else {
                // For official sets, use legacy auto-generation logic (all eligible)
                baseCards.forEach(card => {
                    mixed.push({ ...card, variation: 'Normal' });
                    if (isReverseHoloEligible(card)) {
                        mixed.push({ ...card, variation: 'Reverse', id: `${card.id}-rev` });
                    }
                });
            }
            return mixed;
        }

        return baseCards;
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
                        onClick={onBack}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-bold text-white leading-tight">{currentSet.name}</h2>
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
                            {isCustomSet ? (currentSet.series || 'Custom') : currentSet.series} • {cards.length} Cards
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!isCustomSet && (
                        <>
                            <CustomDropdown
                                value={filterMode}
                                onChange={(val) => setFilterMode(val as any)}
                                options={[
                                    { label: 'Standard Set', value: 'standard' },
                                    { label: 'Master Set (Full)', value: 'master-mixed' },
                                ]}
                                className="w-48"
                            />

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
                        <button
                            onClick={() => setShowDeleteSetConfirm(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 transition-all text-sm font-semibold text-red-400 hover:text-red-300"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Set
                        </button>
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
                            <motion.div
                                key={card.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(index * 0.01, 0.5) }}
                                className="relative aspect-[2.5/3.5] group cursor-pointer"
                                onClick={() => setPreviewCard(card)}
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

                                    {/* View button - appears on hover */}
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

                                    {/* Variation Badge */}
                                    {card.variation === 'Reverse' && (
                                        <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter bg-gradient-to-r from-pokemon-blue to-pokemon-red text-white shadow-lg">
                                            Reverse
                                        </div>
                                    )}

                                    {/* Delete button for custom cards */}
                                    {isCustomSet && (
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
                        ))}
                    </div>
                </>
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
        </div>
    );
};

export default SetDetail;
