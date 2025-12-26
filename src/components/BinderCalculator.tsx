import React, { useState } from 'react';
import { Book, Check, AlertTriangle, ChevronDown, ChevronUp, Sparkles, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { geminiService } from '../services/gemini';

interface BinderCalculatorProps {
    totalCards: number;
}

// Common binder configurations with typical total slot counts
const BINDER_PRESETS = [
    { pockets: 4, slots: 40, name: '4-Pocket Mini', pages: 10 },
    { pockets: 4, slots: 80, name: '4-Pocket Standard', pages: 20 },
    { pockets: 6, slots: 60, name: '6-Pocket Slim', pages: 10 },
    { pockets: 6, slots: 120, name: '6-Pocket Standard', pages: 20 },
    { pockets: 9, slots: 180, name: '9-Pocket Small', pages: 20 },
    { pockets: 9, slots: 360, name: '9-Pocket Standard', pages: 40 },
    { pockets: 9, slots: 540, name: '9-Pocket Large', pages: 60 },
    { pockets: 12, slots: 96, name: '12-Pocket Slim', pages: 8 },
    { pockets: 12, slots: 120, name: '12-Pocket Standard', pages: 10 },
    { pockets: 12, slots: 240, name: '12-Pocket Large', pages: 20 },
];

const BinderCalculator: React.FC<BinderCalculatorProps> = ({ totalCards }) => {
    const [selectedPockets, setSelectedPockets] = useState<number>(9);
    const [isExpanded, setIsExpanded] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
    const [loadingAI, setLoadingAI] = useState(false);

    // Get presets for selected pocket type
    const availablePresets = BINDER_PRESETS.filter(b => b.pockets === selectedPockets);

    // Calculate pages needed
    const pagesNeeded = Math.ceil(totalCards / selectedPockets);
    const totalSlotsNeeded = pagesNeeded * selectedPockets;
    const emptySlots = totalSlotsNeeded - totalCards;

    // Find which presets can fit this set
    const fittingPresets = availablePresets.filter(p => p.slots >= totalCards);
    const recommendedPreset = fittingPresets.length > 0 ? fittingPresets[0] : null;

    const fetchAISuggestions = async () => {
        const apiKey = localStorage.getItem('GEMINI_API_KEY');
        if (!apiKey) {
            setAiSuggestion('Please add your Gemini API Key in settings to get binder brand recommendations!');
            return;
        }

        try {
            setLoadingAI(true);
            const suggestion = await geminiService.suggestBinderBrands(selectedPockets, totalCards, pagesNeeded);
            setAiSuggestion(suggestion ?? null);
        } catch (err: any) {
            console.error('Gemini API Error:', err);
            setAiSuggestion(`Error: ${err?.message || 'Failed to get suggestions'}`);
        } finally {
            setLoadingAI(false);
        }
    };

    return (
        <div className="mb-6 rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            {/* Collapsible Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 p-4 hover:bg-white/5 transition-colors"
            >
                <Book className="w-5 h-5 text-pokemon-blue" />
                <h3 className="text-lg font-bold text-white">Binder Calculator</h3>
                <span className="ml-auto text-xs text-slate-400 mr-2">
                    {totalCards} cards • {pagesNeeded} pages ({selectedPockets}-pocket)
                </span>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 mt-3">
                            {/* Pocket Size Selector */}
                            <div className="flex gap-2 mb-4">
                                {[4, 6, 9, 12].map(pockets => (
                                    <button
                                        key={pockets}
                                        onClick={() => {
                                            setSelectedPockets(pockets);
                                            setAiSuggestion(null); // Clear AI suggestion when pocket size changes
                                        }}
                                        className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all ${selectedPockets === pockets
                                            ? 'bg-pokemon-blue text-white shadow-lg shadow-pokemon-blue/30'
                                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                            }`}
                                    >
                                        {pockets}-Pocket
                                    </button>
                                ))}
                            </div>

                            {/* Calculation Summary */}
                            <div className="grid grid-cols-3 gap-3 mb-4 p-3 rounded-xl bg-white/5">
                                <div className="text-center">
                                    <div className="text-2xl font-black text-white">{pagesNeeded}</div>
                                    <div className="text-xs text-slate-400">Pages Needed</div>
                                </div>
                                <div className="text-center border-x border-white/10">
                                    <div className="text-2xl font-black text-white">{totalSlotsNeeded}</div>
                                    <div className="text-xs text-slate-400">Total Slots</div>
                                </div>
                                <div className="text-center">
                                    <div className={`text-2xl font-black ${emptySlots === 0 ? 'text-emerald-400' : 'text-pokemon-yellow'}`}>
                                        {emptySlots}
                                    </div>
                                    <div className="text-xs text-slate-400">Empty Slots</div>
                                </div>
                            </div>

                            {/* Binder Size Options */}
                            <div className="space-y-2 mb-4">
                                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Common {selectedPockets}-Pocket Binders
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    {availablePresets.map(preset => {
                                        const fits = preset.slots >= totalCards;
                                        const pagesUsed = Math.ceil(totalCards / preset.pockets);
                                        const pagesLeft = preset.pages - pagesUsed;

                                        return (
                                            <div
                                                key={preset.name}
                                                className={`p-3 rounded-xl border ${fits
                                                    ? preset === recommendedPreset
                                                        ? 'bg-emerald-500/10 border-emerald-500/30'
                                                        : 'bg-white/5 border-white/10'
                                                    : 'bg-red-500/5 border-red-500/20 opacity-60'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-bold text-white text-sm">{preset.name}</span>
                                                    {fits ? (
                                                        <Check className="w-4 h-4 text-emerald-400" />
                                                    ) : (
                                                        <AlertTriangle className="w-4 h-4 text-red-400" />
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-400 space-y-1">
                                                    <div className="flex justify-between">
                                                        <span>Capacity:</span>
                                                        <span className="text-slate-200">{preset.slots} slots ({preset.pages} pages)</span>
                                                    </div>
                                                    {fits ? (
                                                        <div className="flex justify-between text-emerald-400">
                                                            <span>Spare:</span>
                                                            <span>{pagesLeft} pages ({preset.slots - totalCards} slots)</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-between text-red-400">
                                                            <span>Short by:</span>
                                                            <span>{totalCards - preset.slots} slots</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Recommendation */}
                            <div className={`p-3 rounded-xl mb-4 ${recommendedPreset ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-pokemon-yellow/10 border border-pokemon-yellow/20'}`}>
                                <div className="flex items-center gap-2 text-sm">
                                    {recommendedPreset ? (
                                        <>
                                            <Check className="w-4 h-4 text-emerald-400" />
                                            <span className="text-slate-300">
                                                <strong className="text-emerald-400">Best fit:</strong>{' '}
                                                <strong className="text-white">{recommendedPreset.name}</strong> binder ({recommendedPreset.slots} slots) —
                                                uses <strong className="text-white">{pagesNeeded}</strong> of <strong className="text-white">{recommendedPreset.pages}</strong> pages
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle className="w-4 h-4 text-pokemon-yellow" />
                                            <span className="text-slate-300">
                                                <strong className="text-pokemon-yellow">Too many cards!</strong>{' '}
                                                You'll need a larger binder or multiple binders. Need at least <strong className="text-white">{totalSlotsNeeded}</strong> slots.
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* AI Brand Suggestions */}
                            <div className="border-t border-white/10 pt-4">
                                <button
                                    onClick={fetchAISuggestions}
                                    disabled={loadingAI}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 text-purple-300 transition-all text-sm font-medium disabled:opacity-50"
                                >
                                    {loadingAI ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Sparkles className="w-4 h-4" />
                                    )}
                                    {loadingAI ? 'Finding best binders...' : 'AI: Suggest Binder Brands'}
                                </button>

                                {aiSuggestion && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-4 p-4 rounded-xl bg-purple-500/5 border border-purple-500/10"
                                    >
                                        <div className="flex items-center gap-2 mb-3">
                                            <Sparkles className="w-3 h-3 text-purple-400" />
                                            <span className="text-purple-400 font-bold uppercase tracking-wider text-[10px]">
                                                AI Binder Recommendations
                                            </span>
                                            <button
                                                onClick={() => setAiSuggestion(null)}
                                                className="ml-auto p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                                            {aiSuggestion}
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default BinderCalculator;
