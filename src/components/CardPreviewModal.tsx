import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Loader2, Minus, Languages } from 'lucide-react';
import { PokemonCard } from '../types/pokemon';
import CardImage from './CardImage';
import { addCustomCard } from '../services/customSets';
import { pokemonTcgApi } from '../services/pokemonTcgApi';
import VariationPicker from './VariationPicker';
import { getSetVariants } from '../utils/variantOverrides';
import { translateText } from '../services/translationService';

interface CardPreviewModalProps {
    card: PokemonCard | null;
    isOpen: boolean;
    onClose: () => void;
    // Props for AddCardModal context
    onAdd?: (card: PokemonCard, variation?: string) => void;
    // Props for custom set variant addition
    customSetId?: string;
    onVariantAdded?: () => void;
    onRemove?: (card: PokemonCard) => void;
    existingVariations?: string[]; // Variations already in the custom set for this card number
    showEnglishNames?: boolean;
}

const CardPreviewModal: React.FC<CardPreviewModalProps> = ({
    card,
    isOpen,
    onClose,
    onAdd,
    customSetId,
    onVariantAdded,
    onRemove,
    existingVariations = [],
    showEnglishNames = false
}) => {
    const [showVariantPicker, setShowVariantPicker] = useState(false);
    const [fullCardData, setFullCardData] = useState<PokemonCard | null>(null);
    const [loadingCardData, setLoadingCardData] = useState(false);
    const [translatedData, setTranslatedData] = useState<{
        name?: string;
        rarity?: string;
        variation?: string;
    }>({});
    const [translating, setTranslating] = useState(false);

    // Translate card details only when modal opens and toggle is on
    useEffect(() => {
        const translate = async () => {
            if (isOpen && card && showEnglishNames) {
                // Heuristic: only translate if it looks Japanese
                const hasCJK = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(card.name);
                if (!hasCJK) {
                    setTranslatedData({});
                    return;
                }

                setTranslating(true);
                try {
                    const [enName, enRarity, enVar] = await Promise.all([
                        translateText(card.name),
                        card.rarity ? translateText(card.rarity) : Promise.resolve(undefined),
                        card.variation ? translateText(card.variation) : Promise.resolve(undefined)
                    ]);
                    setTranslatedData({
                        name: enName,
                        rarity: enRarity,
                        variation: enVar
                    });
                } catch (err) {
                    console.error('Individual translation failed:', err);
                } finally {
                    setTranslating(false);
                }
            } else {
                setTranslatedData({});
            }
        };

        translate();
    }, [isOpen, card?.id, showEnglishNames]);

    // Reset state when card changes
    useEffect(() => {
        setFullCardData(null);
        setShowVariantPicker(false);
    }, [card?.id]);

    if (!isOpen || !card) return null;

    const isCustomSetContext = !!customSetId;

    // Add a variant card
    const handleAddVariant = (variation: string) => {
        if (onAdd) {
            onAdd(card, variation);
            onVariantAdded?.();
            setShowVariantPicker(false);
            return;
        }

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
        const variants = getSetVariants(cardSetId, card.supertype, releaseYear, card.subtypes, card.name);

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

                // Double check variants with full data (for accurate supertype, subtypes, and name)
                const fullVariants = getSetVariants(cardSetId, fullData.supertype, releaseYear, fullData.subtypes, fullData.name);
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

                        {/* Add Variant / Quantity controls - bottom right on the card */}
                        {isCustomSetContext && !loadingCardData && (
                            <div className="absolute bottom-3 right-3 flex items-center">
                                {(() => {
                                    const cardSetId = card.set?.id || '';
                                    const releaseYear = card.set?.releaseDate ? parseInt(card.set.releaseDate.split('-')[0]) : undefined;
                                    const variants = getSetVariants(cardSetId, card.supertype, releaseYear, card.subtypes, card.name);

                                    // If this is a special card that skips variants, check "Normal" quantity
                                    const currentVar = card.variation || 'Normal';
                                    const count = existingVariations.filter(v => v === currentVar).length;

                                    if (count > 0 && variants.length === 0) {
                                        return (
                                            <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 shadow-lg">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onRemove?.(card);
                                                        onVariantAdded?.(); // Refresh set data
                                                    }}
                                                    className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <span className="text-white font-bold text-sm min-w-[20px] text-center">{count}</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAddVariant(currentVar);
                                                    }}
                                                    className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    }

                                    return (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenVariantPicker();
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-pokemon-purple hover:bg-pokemon-purple/80 text-white text-sm font-bold shadow-lg transition-all"
                                        >
                                            <Plus className="w-4 h-4" />
                                            {variants.length > 0 ? 'Add Variant' : 'Add to Set'}
                                        </button>
                                    );
                                })()}
                            </div>
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
                        <div className="flex items-center justify-center gap-2 mb-1">
                            {translating && <Loader2 className="w-3 h-3 animate-spin text-pokemon-blue" />}
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                {translatedData.name || card.name}
                                {translatedData.name && (
                                    <span className="text-[10px] text-pokemon-blue/70">
                                        <Languages className="w-3 h-3" />
                                    </span>
                                )}
                            </h3>
                        </div>

                        {/* Card details */}
                        <div className="flex items-center justify-center gap-3 mt-2 text-sm text-slate-400">
                            <span>#{card.number}</span>
                            {(translatedData.rarity || card.rarity) && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                                    <span>{translatedData.rarity || card.rarity}</span>
                                </>
                            )}
                            {(translatedData.variation || card.variation) && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                                    <span className="text-pokemon-purple">{translatedData.variation || card.variation}</span>
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
