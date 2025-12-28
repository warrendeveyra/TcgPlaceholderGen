import React from 'react';
import { motion } from 'framer-motion';
import { Download, X, Sparkles } from 'lucide-react';
import { SharedSetData } from '../services/shareService';

interface ImportSetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: () => void;
    sharedSet: SharedSetData | null;
    isImporting: boolean;
}

const ImportSetModal: React.FC<ImportSetModalProps> = ({
    isOpen,
    onClose,
    onImport,
    sharedSet,
    isImporting,
}) => {
    if (!isOpen || !sharedSet) return null;

    return (
        <div
            className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-gradient-to-br from-slate-900 to-slate-950 border border-pokemon-blue/30 rounded-2xl p-6 max-w-md w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center">
                    {/* Header */}
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-pokemon-blue/20 flex items-center justify-center">
                        <Sparkles className="w-7 h-7 text-pokemon-blue" />
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">Shared Set Found!</h3>

                    {/* Set Info Card */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-left">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-pokemon-purple/20 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-pokemon-purple" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white">{sharedSet.set_name}</h4>
                                <p className="text-xs text-slate-500">{sharedSet.set_series || 'Custom Set'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-400">
                            <span><span className="font-bold text-white">{sharedSet.cards.length}</span> Cards</span>
                            <span className="w-1 h-1 rounded-full bg-slate-600" />
                            <span><span className="font-bold text-white">{sharedSet.view_count}</span> Views</span>
                        </div>
                    </div>

                    <p className="text-slate-400 text-sm mb-6">
                        Would you like to import this set to your collection?<br />
                        <span className="text-slate-500">A copy will be created that you can edit.</span>
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onImport}
                            disabled={isImporting}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-pokemon-blue hover:bg-pokemon-blue/90 text-white font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isImporting ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" />
                                    Import Set
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ImportSetModal;
