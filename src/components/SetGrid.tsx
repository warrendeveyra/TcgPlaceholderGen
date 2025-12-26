import React from 'react';
import { useSetContext } from '../context/SetContext';
import SetCard from './SetCard';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const SetGrid: React.FC = () => {
    const { sets, loading, error, setSelectedSet } = useSetContext();

    if (loading) {
        return (
            <div className="w-full flex flex-col items-center justify-center py-24 gap-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-pokemon-yellow/20 blur-2xl rounded-full animate-pulse" />
                    <Loader2 className="relative w-12 h-12 text-pokemon-yellow animate-spin" />
                </div>
                <p className="text-slate-400 animate-pulse font-medium">Summoning TCG Sets...</p>
            </div>
        );
    }

    if (error) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full p-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-center"
            >
                <p className="text-red-400 font-medium mb-4">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all text-sm font-semibold shadow-lg shadow-red-500/20 active:scale-95"
                >
                    Try Again
                </button>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 w-full"
        >
            {sets.map((set, index) => (
                <motion.div
                    key={set.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                >
                    <SetCard
                        set={set}
                        onClick={(set) => setSelectedSet(set)}
                    />
                </motion.div>
            ))}
        </motion.div>
    );
};

export default SetGrid;
