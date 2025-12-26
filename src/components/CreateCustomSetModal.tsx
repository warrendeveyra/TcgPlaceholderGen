import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Sparkles } from 'lucide-react';
import { createCustomSet, CustomSet } from '../services/customSets';

interface CreateCustomSetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (set: CustomSet) => void;
}

const CreateCustomSetModal: React.FC<CreateCustomSetModalProps> = ({ isOpen, onClose, onCreated }) => {
    const [name, setName] = useState('');
    const [series, setSeries] = useState('Custom');

    const handleCreate = () => {
        if (!name.trim()) return;

        const newSet = createCustomSet(name.trim(), series.trim() || 'Custom');
        onCreated(newSet);
        setName('');
        setSeries('Custom');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 p-8 rounded-3xl shadow-2xl"
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-pokemon-blue/20 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-pokemon-blue" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Create Custom Set</h3>
                            <p className="text-slate-400 text-sm">Build your own card collection</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Set Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., My Collection"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-pokemon-blue/50 focus:border-pokemon-blue/50 outline-none transition-all text-sm text-white placeholder-slate-500"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Series
                        </label>
                        <input
                            type="text"
                            value={series}
                            onChange={(e) => setSeries(e.target.value)}
                            placeholder="e.g., Custom, Personal, etc."
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-pokemon-blue/50 focus:border-pokemon-blue/50 outline-none transition-all text-sm text-white placeholder-slate-500"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!name.trim()}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-pokemon-blue hover:bg-pokemon-blue/90 text-white font-semibold shadow-lg shadow-pokemon-blue/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="w-4 h-4" />
                        Create Set
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default CreateCustomSetModal;
