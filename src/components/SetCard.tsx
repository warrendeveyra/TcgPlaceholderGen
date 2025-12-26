import React from 'react';
import { PokemonSet } from '../types/pokemon';
import { motion } from 'framer-motion';

interface SetCardProps {
    set: PokemonSet;
    onClick: (set: PokemonSet) => void;
}

const SetCard: React.FC<SetCardProps> = ({ set, onClick }) => {
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
                        alt={set.name}
                        className="max-h-full max-w-full object-contain filter drop-shadow-xl group-hover:scale-110 group-hover:drop-shadow-2xl transition-all duration-500"
                        loading="lazy"
                        onError={(e) => {
                            const parent = e.currentTarget.parentElement;
                            e.currentTarget.style.display = 'none';
                            if (parent) {
                                const fallback = parent.querySelector('.set-fallback');
                                if (fallback) (fallback as HTMLElement).style.display = 'flex';
                            }
                        }}
                    />
                ) : null}

                {/* Stylized placeholder for missing images */}
                <div
                    className={`set-fallback flex-col items-center justify-center text-center px-4 ${set.images.logo ? 'hidden' : 'flex'}`}
                >
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-pokemon-yellow/30 via-pokemon-red/30 to-pokemon-blue/30 blur-2xl rounded-full animate-pulse" />
                        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-white/20 rounded-xl px-5 py-4 shadow-xl backdrop-blur-sm">
                            <div className="text-lg font-bold bg-gradient-to-r from-pokemon-yellow via-white to-pokemon-yellow bg-clip-text text-transparent leading-tight">
                                {set.name}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1.5 uppercase tracking-widest font-medium">
                                {set.series} • {set.total} Cards
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold text-pokemon-yellow/70 uppercase tracking-widest">
                        {set.series}
                    </span>
                    <img src={set.images.symbol} alt="" className="h-4 w-4 opacity-50 group-hover:opacity-80 transition-opacity" />
                </div>
                <h3 className="text-base font-bold text-white truncate group-hover:text-pokemon-yellow transition-colors duration-200 leading-tight">
                    {set.name}
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
