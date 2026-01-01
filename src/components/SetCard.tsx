import React from 'react';
import { PokemonSet } from '../types/pokemon';
import { motion } from 'framer-motion';
import { Languages } from 'lucide-react';
import promoLogo from '../assets/pokemon-promo-set-logo.png';

interface SetCardProps {
    set: PokemonSet;
    onClick: (set: PokemonSet) => void;
}

const SetCard: React.FC<SetCardProps> = ({ set, onClick }) => {
    const isPromoSet = set.name.toLowerCase().includes('promo');
    // Translation is now handled by SetContext, so just display set.name
    const displayName = set.name;
    const isTranslated = !!set.originalName; // Check if set was translated

    return (
        <motion.div
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative group overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 backdrop-blur-sm cursor-pointer shadow-card hover:shadow-card-hover hover:border-white/20 transition-all duration-300"
            onClick={() => onClick(set)}
        >
            {/* Top glow effect on hover */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pokemon-blue/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="aspect-[16/9] w-full p-6 flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent relative overflow-hidden">
                {/* Background shimmer effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
                </div>

                {set.images.logo ? (
                    <img
                        src={set.images.logo}
                        alt={displayName}
                        className="max-h-full max-w-full object-contain filter drop-shadow-xl group-hover:scale-110 group-hover:drop-shadow-2xl transition-all duration-500"
                        loading="lazy"
                        onError={(e) => {
                            const target = e.currentTarget;
                            if (isPromoSet) {
                                target.src = promoLogo;
                            } else {
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                    const fallback = parent.querySelector('.set-fallback');
                                    if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                }
                            }
                        }}
                    />
                ) : isPromoSet ? (
                    <img
                        src={promoLogo}
                        alt="Promo Set"
                        className="max-h-full max-w-full object-contain filter drop-shadow-xl group-hover:scale-110 group-hover:drop-shadow-2xl transition-all duration-500"
                    />
                ) : null}

                {/* Pokéball Fallback for missing images */}
                <div
                    className={`set-fallback flex-col items-center justify-center text-center px-4 ${(set.images.logo || isPromoSet) ? 'hidden' : 'flex'}`}
                >
                    <div className="relative group-hover:scale-110 transition-transform duration-500">
                        {/* Pokéball SVG */}
                        <div className="relative w-28 h-28">
                            <div className="absolute inset-0 bg-gradient-to-r from-pokemon-red/20 via-pokemon-blue/20 to-pokemon-purple/20 blur-3xl rounded-full animate-pulse" />
                            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl relative z-10">
                                {/* Top Half (Red) */}
                                <path d="M50 5 A45 45 0 0 1 95 50 H5 A45 45 0 0 1 50 5" fill="#EF4444" />
                                {/* Bottom Half (White) */}
                                <path d="M5 50 A45 45 0 0 0 95 50 H5" fill="#F8FAFC" />
                                {/* Middle Black Line */}
                                <rect x="5" y="47" width="90" height="6" fill="#1E293B" />
                                {/* Center Circle (Outer) */}
                                <circle cx="50" cy="50" r="12" fill="#1E293B" />
                                {/* Center Circle (Inner Button) */}
                                <circle cx="50" cy="50" r="8" fill="#F8FAFC" stroke="#1E293B" strokeWidth="1" />
                                {/* Button Highlight */}
                                <circle cx="48" cy="48" r="3" fill="#FFF" fillOpacity="0.5" />
                                {/* Glossy Overlay */}
                                <path d="M20 30 A35 35 0 0 1 50 15" fill="none" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent">
                <div className="flex items-center justify-between mb-1.5">
                    <span
                        className="text-[10px] font-semibold text-pokemon-yellow/70 uppercase tracking-widest truncate max-w-[80%]"
                        title={set.originalSeries || set.series}
                    >
                        {set.series}
                    </span>
                    <img src={set.images.symbol} alt="" className="h-4 w-4 opacity-50 group-hover:opacity-80 transition-opacity" />
                </div>
                <h3
                    className="text-base font-bold text-white truncate group-hover:text-pokemon-yellow transition-colors duration-200 leading-tight flex items-center gap-2"
                    title={set.originalName || set.name}
                >
                    {displayName}
                    {isTranslated && (
                        <div className="shrink-0 flex items-center justify-center p-1 rounded-md bg-pokemon-blue/20 text-pokemon-blue border border-pokemon-blue/30" title="Translated from Japanese">
                            <Languages className="w-2.5 h-2.5" />
                        </div>
                    )}
                </h3>
                <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                        <span className="font-bold text-white/90">{set.total}</span> Cards
                    </span>
                    {set.releaseDate && (
                        <>
                            <span className="w-1 h-1 rounded-full bg-slate-600" />
                            <span className="text-slate-500">{new Date(set.releaseDate).getFullYear()}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Decorative corner accent */}
            <div className="absolute top-0 right-0 w-16 h-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-pokemon-blue/20 to-transparent" />
            </div>
        </motion.div>
    );
};

export default SetCard;
