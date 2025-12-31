import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Plus, FolderPlus, Loader2, CheckCircle2 } from 'lucide-react';
import { useSetContext } from '../context/SetContext';
import { addCustomCardsBulk } from '../services/customSets';
import { PokemonCard } from '../types/pokemon';

interface BulkAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedCards: PokemonCard[];
    onSuccess: () => void;
}

const BulkAddModal: React.FC<BulkAddModalProps> = ({ isOpen, onClose, selectedCards, onSuccess }) => {
    const { customSets } = useSetContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Filtered custom sets
    const filteredSets = useMemo(() => {
        return customSets.filter(set =>
            set.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            set.series.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [customSets, searchTerm]);

    const handleBulkAdd = async (setId: string) => {
        try {
            setIsProcessing(true);

            const cardsToAdd = selectedCards.map(card => ({
                name: card.name,
                number: card.number,
                rarity: card.rarity,
                imageUrl: card.images.small,
                sourceCard: card,
                variation: card.variation
            }));

            addCustomCardsBulk(setId, cardsToAdd);

            setIsSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
                setIsSuccess(false);
            }, 1500);
        } catch (err) {
            console.error('Failed to bulk add cards:', err);
            alert('Something went wrong. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {isSuccess ? (
                    <div className="p-12 text-center">
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6"
                        >
                            <CheckCircle2 className="w-10 h-10 text-green-500" />
                        </motion.div>
                        <h3 className="text-2xl font-bold text-white mb-2">Success!</h3>
                        <p className="text-slate-400">Added {selectedCards.length} cards to your set.</p>
                    </div>
                ) : (
                    <>
                        <div className="p-6 border-b border-white/5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-pokemon-blue/20 flex items-center justify-center">
                                        <FolderPlus className="w-6 h-6 text-pokemon-blue" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Add to Custom Set</h3>
                                        <p className="text-slate-400 text-xs">{selectedCards.length} cards selected</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Search your custom sets..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-pokemon-blue/50 outline-none transition-all text-sm text-white placeholder-slate-500"
                                />
                            </div>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
                            {filteredSets.length > 0 ? (
                                filteredSets.map(set => (
                                    <button
                                        key={set.id}
                                        onClick={() => handleBulkAdd(set.id)}
                                        disabled={isProcessing}
                                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all group text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center border border-white/5">
                                                {set.images?.symbol ? (
                                                    <img src={set.images.symbol} alt="" className="w-6 h-6 object-contain" />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-slate-700" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-white group-hover:text-pokemon-blue transition-colors">
                                                    {set.name}
                                                </div>
                                                <div className="text-xs text-slate-500">{set.series}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-slate-600 font-medium">
                                            {set.total} cards
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="p-8 text-center text-slate-500 font-medium italic text-sm">
                                    No custom sets found
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-slate-900/50 border-t border-white/5">
                            <button
                                onClick={() => {
                                    // This would ideally open the create set modal, 
                                    // but for now we'll just prompt or redirect.
                                    // We'll let the user manage this in the main UI for simplicity.
                                    alert('Please create a new set from the main dashboard first.');
                                }}
                                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/20 hover:border-pokemon-blue/50 hover:bg-pokemon-blue/5 text-slate-400 hover:text-pokemon-blue font-medium text-sm transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                Create New Set
                            </button>
                        </div>
                    </>
                )}

                {isProcessing && (
                    <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-pokemon-blue animate-spin" />
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default BulkAddModal;
