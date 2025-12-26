import React, { useState } from 'react';

interface CardImageProps {
    src: string;
    alt: string;
    className?: string;
}

// Fun Pokémon type colors for placeholders
const TYPE_COLORS: Record<string, string> = {
    pikachu: 'from-yellow-400 to-yellow-600',
    charizard: 'from-orange-500 to-red-600',
    blastoise: 'from-blue-400 to-blue-600',
    venusaur: 'from-green-400 to-green-600',
    mewtwo: 'from-purple-400 to-purple-600',
    gengar: 'from-purple-500 to-indigo-700',
    dragonite: 'from-orange-400 to-orange-500',
    eevee: 'from-amber-300 to-amber-500',
    default: 'from-slate-600 to-slate-800',
};

const getColorForName = (name: string): string => {
    const lowerName = name.toLowerCase();
    for (const [key, value] of Object.entries(TYPE_COLORS)) {
        if (lowerName.includes(key)) return value;
    }
    // Generate a consistent color based on name hash
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
        'from-red-500 to-red-700',
        'from-blue-500 to-blue-700',
        'from-green-500 to-green-700',
        'from-yellow-500 to-yellow-700',
        'from-purple-500 to-purple-700',
        'from-pink-500 to-pink-700',
        'from-indigo-500 to-indigo-700',
        'from-cyan-500 to-cyan-700',
    ];
    return colors[hash % colors.length];
};

const CardImage: React.FC<CardImageProps> = ({ src, alt, className = '' }) => {
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    if (!src || hasError) {
        // Stylish placeholder with card name
        const colorGradient = getColorForName(alt);
        return (
            <div className={`relative ${className} bg-gradient-to-br ${colorGradient} flex items-center justify-center`}>
                {/* Card frame decoration */}
                <div className="absolute inset-1 border-2 border-white/20 rounded-lg" />

                {/* Card content */}
                <div className="relative text-center p-2 z-10">
                    {/* Pokéball icon */}
                    <div className="relative w-12 h-12 mx-auto mb-2">
                        <div className="absolute inset-0 rounded-full bg-white/20" />
                        <div className="absolute inset-0 rounded-full overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1/2 bg-red-500/60" />
                            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-white/60" />
                            <div className="absolute top-1/2 left-0 right-0 h-1 bg-black/40 -translate-y-1/2" />
                            <div className="absolute top-1/2 left-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full border-2 border-black/40" />
                        </div>
                    </div>

                    {/* Card name */}
                    <div className="bg-black/30 backdrop-blur-sm rounded px-2 py-1">
                        <p className="text-xs font-bold text-white truncate max-w-[80px]">
                            {alt}
                        </p>
                    </div>
                </div>

                {/* Decorative sparkles */}
                <div className="absolute top-2 right-2 text-white/40 text-lg">✨</div>
                <div className="absolute bottom-2 left-2 text-white/30 text-sm">⭐</div>
            </div>
        );
    }

    return (
        <div className={`relative ${className}`}>
            {isLoading && (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900 animate-pulse flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                </div>
            )}
            <img
                src={src}
                alt={alt}
                className={`w-full h-full object-cover transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                loading="lazy"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                    setHasError(true);
                    setIsLoading(false);
                }}
            />
        </div>
    );
};

export default CardImage;
