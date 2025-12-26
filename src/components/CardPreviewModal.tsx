import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Check } from 'lucide-react';
import { PokemonCard } from '../types/pokemon';
import CardImage from './CardImage';

interface CardPreviewModalProps {
    card: PokemonCard | null;
    isOpen: boolean;
    onClose: () => void;
    onAdd?: (card: PokemonCard) => void;
    isAdded?: boolean;
}

const CardPreviewModal: React.FC<CardPreviewModalProps> = ({
    card,
    isOpen,
    onClose,
    onAdd,
    isAdded = false
}) => {
    if (!isOpen || !card) return null;

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative max-w-md w-full"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Card Image */}
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                        <CardImage
                            src={card.images.large || card.images.small}
                            alt={card.name}
                            className="w-full aspect-[2.5/3.5]"
                        />

                        {/* Holographic shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/10 to-white/0 pointer-events-none opacity-50" />
                    </div>

                    {/* Card Info */}
                    <div className="mt-4 text-center">
                        <h3 className="text-xl font-bold text-white">{card.name}</h3>

                        {/* Card details */}
                        <div className="flex items-center justify-center gap-3 mt-2 text-sm text-slate-400">
                            <span>#{card.number}</span>
                            {card.rarity && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                                    <span>{card.rarity}</span>
                                </>
                            )}
                        </div>

                        {/* Set info - ALWAYS shown prominently */}
                        <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">From Set</p>
                            {card.set?.name ? (
                                <div className="flex items-center justify-center gap-2">
                                    {card.set.images?.symbol && (
                                        <img
                                            src={card.set.images.symbol}
                                            alt={card.set.name}
                                            className="w-5 h-5 object-contain"
                                        />
                                    )}
                                    <span className="text-sm font-medium text-white">{card.set.name}</span>
                                    {card.set.series && (
                                        <span className="text-xs text-slate-400">• {card.set.series}</span>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic">Set information not available</p>
                            )}
                        </div>
                    </div>

                    {/* Add Button */}
                    {onAdd && (
                        <div className="mt-6">
                            <button
                                onClick={() => onAdd(card)}
                                disabled={isAdded}
                                className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${isAdded
                                    ? 'bg-pokemon-green text-white cursor-default'
                                    : 'bg-pokemon-blue hover:bg-pokemon-blue/90 text-white shadow-lg shadow-pokemon-blue/30'
                                    }`}
                            >
                                {isAdded ? (
                                    <>
                                        <Check className="w-5 h-5" />
                                        Added to Set
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-5 h-5" />
                                        Add to Custom Set
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CardPreviewModal;
