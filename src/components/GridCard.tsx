import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { PokemonCard } from '../types/pokemon';

interface GridCardProps {
    card: PokemonCard;
    index: number;
    isSelectMode: boolean;
    isSelected: boolean;
    onClick: () => void;
    onDelete?: (card: PokemonCard) => void;
    isCustomSet?: boolean;
}

const GridCard: React.FC<GridCardProps> = ({
    card,
    index,
    isSelectMode,
    isSelected,
    onClick,
    onDelete,
    isCustomSet
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            {
                rootMargin: '200px', // Start loading before it enters viewport
                threshold: 0.01
            }
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => {
            if (cardRef.current) {
                observer.unobserve(cardRef.current);
            }
        };
    }, []);

    // Safety: Ensure we only use 'small' images for the grid to save memory
    const imageUrl = card.images.small;

    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.01, 0.5) }}
            className={`relative aspect-[2.5/3.5] group cursor-pointer ${isSelectMode && isSelected ? 'ring-2 ring-pokemon-purple ring-offset-2 ring-offset-slate-900 rounded-lg' : ''}`}
            onClick={onClick}
        >
            <div className={`absolute inset-0 rounded-lg border overflow-hidden transition-all duration-300 ${card.variation === 'Reverse' || card.variation === 'Reverse Holo'
                ? 'bg-gradient-to-br from-pokemon-blue/20 to-pokemon-red/20 border-pokemon-blue/30 shadow-[0_0_15px_-5px_rgba(59,76,202,0.5)]'
                : 'bg-white/5 border-white/10 group-hover:border-pokemon-yellow/50'
                }`}>

                {isVisible ? (
                    <>
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt={card.name}
                                className={`w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105 ${(card.variation === 'Reverse' || card.variation === 'Reverse Holo') ? 'filter saturate-[1.2] brightness-[1.1]' : ''
                                    }`}
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center p-3">
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-slate-500 leading-tight uppercase tracking-wider mb-1">
                                        {card.name}
                                    </p>
                                    <p className="text-[8px] text-slate-600 font-mono">
                                        #{card.number}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Variations Badge */}
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
                        {isCustomSet && !isSelectMode && onDelete && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(card);
                                }}
                                className="absolute top-1 right-1 p-1 rounded bg-red-500/80 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove card"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        )}

                        {/* Selection Overlay */}
                        {isSelectMode && (
                            <div className={`absolute inset-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-pokemon-purple/20' : 'bg-black/40 opacity-0 group-hover:opacity-100'
                                }`}>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-pokemon-purple border-pokemon-purple' : 'border-white/50'
                                    }`}>
                                    {isSelected && (
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    // Simple placeholder while not visible to keep DOM light
                    <div className="w-full h-full flex items-center justify-center bg-slate-800/20">
                        <div className="w-4 h-4 rounded-full border border-slate-700 border-t-pokemon-purple animate-spin opacity-20" />
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default React.memo(GridCard);
