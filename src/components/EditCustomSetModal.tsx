import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Edit2 } from 'lucide-react';
import { updateCustomSet, CustomSet } from '../services/customSets';

interface EditCustomSetModalProps {
    isOpen: boolean;
    onClose: () => void;
    set: CustomSet;
    onUpdated: (updatedSet: CustomSet) => void;
}

const EditCustomSetModal: React.FC<EditCustomSetModalProps> = ({ isOpen, onClose, set, onUpdated }) => {
    const [name, setName] = useState(set.name);
    const [series, setSeries] = useState(set.series);

    useEffect(() => {
        if (isOpen) {
            setName(set.name);
            setSeries(set.series);
        }
    }, [isOpen, set]);

    const handleSave = () => {
        if (!name.trim()) return;

        const updatedSet = updateCustomSet(set.id, {
            name: name.trim(),
            series: series.trim() || 'Custom'
        });

        if (updatedSet) {
            onUpdated(updatedSet);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 p-8 rounded-3xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-pokemon-purple/20 flex items-center justify-center">
                            <Edit2 className="w-5 h-5 text-pokemon-purple" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Edit Set Info</h3>
                            <p className="text-slate-400 text-sm">Update your set details</p>
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
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-pokemon-purple/50 focus:border-pokemon-purple/50 outline-none transition-all text-sm text-white placeholder-slate-500"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Series / Description
                        </label>
                        <input
                            type="text"
                            value={series}
                            onChange={(e) => setSeries(e.target.value)}
                            placeholder="e.g., Custom, Personal, etc."
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-pokemon-purple/50 focus:border-pokemon-purple/50 outline-none transition-all text-sm text-white placeholder-slate-500"
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
                        onClick={handleSave}
                        disabled={!name.trim() || (name === set.name && series === set.series)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-pokemon-blue hover:bg-pokemon-blue/90 text-white font-semibold shadow-lg shadow-pokemon-blue/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" />
                        Save Changes
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default EditCustomSetModal;
