import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Check } from 'lucide-react';
import { PokemonCard } from '../types/pokemon';
import { getSetVariants, hasSpecialVariants } from '../utils/variantOverrides';

interface VariationPickerProps {
    card: PokemonCard;
    onSelect: (variation: string) => void;
    onCancel: () => void;
    existingVariations?: string[]; // For showing which variants already exist
    showAddAll?: boolean; // Show "Add All Versions" button
}

const VariationPicker: React.FC<VariationPickerProps> = ({
    card,
    onSelect,
    onCancel,
    existingVariations = [],
    showAddAll = false,
}) => {
    const cardSetId = card.set?.id || '';
    const releaseYear = card.set?.releaseDate ? parseInt(card.set.releaseDate.split('-')[0]) : undefined;
    const variants = getSetVariants(cardSetId, card.supertype, releaseYear, card.subtypes, card.name);
    const hasSpecial = hasSpecialVariants(cardSetId);

    // Determine which variants can still be added
    const hasVariant = (variation: string) => existingVariations.includes(variation);
    const addableVariants = variants.filter(v => !hasVariant(v));

    // Handle add all
    const handleAddAll = () => {
        addableVariants.forEach(variation => onSelect(variation));
    };

    // Get button styling for each variant type
    const getVariantButton = (variant: string) => {
        let buttonClass = "w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-between ";
        let badgeContent: React.ReactNode;

        const alreadyHas = hasVariant(variant);

        if (variant === 'Reverse Holo') {
            buttonClass += "bg-gradient-to-br from-red-500/20 via-purple-500/20 to-red-500/20 hover:from-red-500/30 hover:via-purple-500/30 hover:to-red-500/30 border border-red-500/40 text-red-100";
            badgeContent = (
                <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-gradient-to-r from-red-600 to-purple-600 text-white shadow-sm">REV</span>
                    {alreadyHas && <Check className="w-4 h-4 text-pokemon-green" />}
                </div>
            );
        } else if (variant === 'Poke Ball Holo') {
            buttonClass += "bg-red-600/20 hover:bg-red-600/30 border border-red-400/50 text-red-100";
            badgeContent = (
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M12 12 L12 22 A10 10 0 0 1 2 12 Z" fill="white" />
                        <path d="M12 12 L22 12 A10 10 0 0 1 12 22 Z" fill="white" />
                        <path d="M12 12 L12 2 A10 10 0 0 1 22 12 Z" fill="#EF4444" />
                        <path d="M12 12 L2 12 A10 10 0 0 1 12 2 Z" fill="#EF4444" />
                        <rect x="2" y="10.5" width="20" height="3" fill="#1F2937" />
                        <circle cx="12" cy="12" r="4" fill="white" stroke="#1F2937" strokeWidth="2" />
                        <circle cx="12" cy="12" r="2" fill="#E5E7EB" />
                        <circle cx="12" cy="12" r="10" fill="none" stroke="#1F2937" strokeWidth="1.5" />
                    </svg>
                    {alreadyHas && <Check className="w-4 h-4 text-pokemon-green" />}
                </div>
            );
        } else if (variant === 'Master Ball Holo') {
            buttonClass += "bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/50 text-purple-100";
            badgeContent = (
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                    {alreadyHas && <Check className="w-4 h-4 text-pokemon-green" />}
                </div>
            );
        } else {
            buttonClass += "bg-white/5 hover:bg-white/10 border border-white/10 text-white";
            badgeContent = (
                <div className="flex items-center gap-2">
                    {variant === 'Normal' ? (
                        <div className="w-4 h-4 rounded-full border border-slate-500" />
                    ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-600 text-white">
                            {variant.slice(0, 3).toUpperCase()}
                        </span>
                    )}
                    {alreadyHas && <Check className="w-4 h-4 text-pokemon-green" />}
                </div>
            );
        }

        return { buttonClass, badgeContent };
    };

    return (
        <div
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h4 className="text-lg font-bold text-white mb-2 text-center">Select Version</h4>
                <p className="text-slate-400 text-sm mb-6 text-center">
                    {hasSpecial
                        ? `This card has ${variants.length} special variant(s). Which would you like to add?`
                        : 'Which version would you like to add?'}
                </p>

                <div className="grid grid-cols-1 gap-3">
                    {/* Standard Version */}
                    {(() => {
                        const { buttonClass, badgeContent } = getVariantButton('Normal');
                        return (
                            <button
                                onClick={() => onSelect('Normal')}
                                className={buttonClass}
                            >
                                <span>Standard Version</span>
                                {badgeContent}
                            </button>
                        );
                    })()}

                    {/* Dynamic Variant Buttons */}
                    {variants.map((variant) => {
                        const { buttonClass, badgeContent } = getVariantButton(variant);
                        return (
                            <button
                                key={variant}
                                onClick={() => onSelect(variant)}
                                className={buttonClass}
                            >
                                <span>{variant}</span>
                                {badgeContent}
                            </button>
                        );
                    })}

                    {/* Add All Versions */}
                    {showAddAll && addableVariants.length > 1 && (
                        <button
                            onClick={handleAddAll}
                            className="w-full py-3 px-4 bg-pokemon-purple/20 hover:bg-pokemon-purple/30 border border-pokemon-purple/30 rounded-xl text-pokemon-purple font-semibold transition-all flex items-center justify-between mt-2"
                        >
                            <span>Add All Versions ({addableVariants.length + (hasVariant('Normal') ? 0 : 1)})</span>
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <button
                    onClick={onCancel}
                    className="w-full mt-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                    Cancel
                </button>
            </motion.div>
        </div>
    );
};

export default VariationPicker;
