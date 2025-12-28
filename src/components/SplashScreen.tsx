import React from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
    onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
    React.useEffect(() => {
        // Auto-dismiss after animation completes
        const timer = setTimeout(() => {
            onComplete();
        }, 2500);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
        >
            {/* Background gradient effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pokemon-blue/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pokemon-red/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pokemon-yellow/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Pokéball Animation */}
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', duration: 1, bounce: 0.4 }}
                className="relative"
            >
                <motion.svg
                    width="120"
                    height="120"
                    viewBox="0 0 100 100"
                    className="drop-shadow-2xl"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, ease: 'easeInOut', delay: 0.5 }}
                >
                    {/* Bottom half - white */}
                    <path d="M2 50 A48 48 0 0 0 98 50" fill="white" />
                    {/* Top half - red */}
                    <path d="M2 50 A48 48 0 0 1 98 50" fill="#E3350D" />
                    {/* Center band */}
                    <rect x="2" y="46" width="96" height="8" fill="#1F2937" />
                    {/* Center button */}
                    <circle cx="50" cy="50" r="14" fill="white" stroke="#1F2937" strokeWidth="4" />
                    {/* Button inner */}
                    <motion.circle
                        cx="50"
                        cy="50"
                        r="7"
                        fill="#1F2937"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.5 }}
                    />
                    {/* Outer ring */}
                    <circle cx="50" cy="50" r="48" fill="none" stroke="#1F2937" strokeWidth="4" />
                </motion.svg>
            </motion.div>

            {/* Title */}
            <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="mt-8 text-3xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-pokemon-blue via-pokemon-red to-pokemon-yellow tracking-tight"
                style={{ fontFamily: "'Outfit', sans-serif" }}
            >
                TCG Master Set Gen
            </motion.h1>

            {/* Loading text */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="mt-4 text-slate-400 text-sm font-medium"
            >
                Loading your collection...
            </motion.p>

            {/* Loading bar */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.3 }}
                className="mt-6 w-48 h-1 bg-white/10 rounded-full overflow-hidden"
            >
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ delay: 1.2, duration: 1.2, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-pokemon-blue via-pokemon-red to-pokemon-yellow rounded-full"
                />
            </motion.div>
        </motion.div>
    );
};

export default SplashScreen;
