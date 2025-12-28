import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Check, Loader2 } from 'lucide-react';
import { PokemonCard } from '../types/pokemon';
import CardImage from './CardImage';
import { addCustomCard } from '../services/customSets';
import { pokemonTcgApi } from '../services/pokemonTcgApi';
import VariationPicker from './VariationPicker';
import { getSetVariants } from '../utils/variantOverrides';

interface CardPreviewModalProps {
    card: PokemonCard | null;
    isOpen: boolean;
    onClose: () => void;
    onAdd?: (card: PokemonCard) => void;
    isAdded?: boolean;
    // Props for custom set variant addition
    customSetId?: string;
    onVariantAdded?: () => void;
    existingVariations?: string[]; // Variations already in the custom set for this card number
}

const CardPreviewModal: React.FC<CardPreviewModalProps> = ({
    card,
    isOpen,
    onClose,
    onAdd,
    isAdded = false,
    customSetId,
    onVariantAdded,
    existingVariations = []
}) => {
    const [showVariantPicker, setShowVariantPicker] = useState(false);
    const [fullCardData, setFullCardData] = useState<PokemonCard | null>(null);
    const [loadingCardData, setLoadingCardData] = useState(false);

    // Reset state when card changes
    useEffect(() => {
        setFullCardData(null);
        setShowVariantPicker(false);
    }, [card?.id]);

    if (!isOpen || !card) return null;

    const isCustomSetContext = !!customSetId;

    // Add a variant card
    const handleAddVariant = (variation: string) => {
        if (!customSetId) return;

        addCustomCard(
            customSetId,
            card.name,
            card.number,
            card.rarity || 'Common',
            card.images.small,
            card,
            variation
        );

        setShowVariantPicker(false);
        onVariantAdded?.();
    };

    // Open variation picker - fetch full card data for accurate supertype
    const handleOpenVariantPicker = async () => {
        // Check for variants before opening picker
        const cardSetId = card.set?.id || '';
        const releaseYear = card.set?.releaseDate ? parseInt(card.set.releaseDate.split('-')[0]) : undefined;
        const variants = getSetVariants(cardSetId, card.supertype, releaseYear);

        if (variants.length === 0) {
            // Directly add as normal version if no variants exist
            handleAddVariant('Normal');
            return;
        }

        if (fullCardData) {
            // Already have verified data
            setShowVariantPicker(true);
            return;
        }

        // Fetch full card data
        const originalSetId = card.set?.id;
        if (!originalSetId) {
            setFullCardData(card);
            setShowVariantPicker(true);
            return;
        }

        try {
            setLoadingCardData(true);
            const response = await pokemonTcgApi.getCardById(`${originalSetId}-${card.number}`);
            if (response.data) {
                // Ensure we merge existing set info (with releaseDate/series) into the new full card data
                // as the individual card API's nested set resolver often returns null for these.
                const fullData = {
                    ...response.data,
                    set: {
                        ...card.set,
                        ...response.data.set
                    }
                } as PokemonCard;

                // Double check variants with full data (for accurate supertype)
                const fullVariants = getSetVariants(cardSetId, fullData.supertype, releaseYear);
                if (fullVariants.length === 0) {
                    handleAddVariant('Normal');
                    return;
                }
                setFullCardData(fullData);
            } else {
                setFullCardData(card);
            }
        } catch (err) {
            console.error('Failed to fetch card details:', err);
            setFullCardData(card);
        } finally {
            setLoadingCardData(false);
            setShowVariantPicker(true);
        }
    };

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

                    {/* Card Image with Add Variant button overlay */}
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                        <CardImage
                            src={card.images.large || card.images.small}
                            alt={card.name}
                            className="w-full aspect-[2.5/3.5]"
                        />

                        {/* Holographic shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/10 to-white/0 pointer-events-none opacity-50" />

                        {/* Current variation badge */}
                        {card.variation && card.variation !== 'Normal' && (
                            <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/70 text-white text-xs font-bold">
                                {card.variation}
                            </div>
                        )}

                        {/* Add Variant button - bottom right on the card */}
                        {isCustomSetContext && !loadingCardData && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenVariantPicker();
                                }}
                                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-pokemon-purple hover:bg-pokemon-purple/80 text-white text-sm font-bold shadow-lg transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                {(() => {
                                    const cardSetId = card.set?.id || '';
                                    const releaseYear = card.set?.releaseDate ? parseInt(card.set.releaseDate.split('-')[0]) : undefined;
                                    const variants = getSetVariants(cardSetId, card.supertype, releaseYear);
                                    return variants.length > 0 ? 'Add Variant' : 'Add to Set';
                                })()}
                            </button>
                        )}

                        {/* Loading indicator */}
                        {isCustomSetContext && loadingCardData && (
                            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 text-white text-sm font-bold shadow-lg">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading...
                            </div>
                        )}
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
                            {card.variation && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                                    <span className="text-pokemon-purple">{card.variation}</span>
                                </>
                            )}
                        </div>

                        {/* Set info */}
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

                    {/* Add Button (for AddCardModal context) */}
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

                {/* Variation Picker Overlay */}
                {showVariantPicker && fullCardData && (
                    <VariationPicker
                        card={fullCardData}
                        onSelect={handleAddVariant}
                        onCancel={() => setShowVariantPicker(false)}
                        existingVariations={existingVariations}
                        showAddAll={true}
                    />
                )}
            </div>
        </AnimatePresence>
    );
};

export default CardPreviewModal;
