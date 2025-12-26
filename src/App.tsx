import { useState, useEffect } from 'react';
import { SetProvider, useSetContext } from './context/SetContext';
import SetGrid from './components/SetGrid';
import SetDetail from './components/SetDetail';
import CreateCustomSetModal from './components/CreateCustomSetModal';
import { deleteCustomSet, CustomSet } from './services/customSets';
import { Search, Sparkles, Settings, FolderPlus, Trash2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

function MainContent() {
    const { selectedSet, setSelectedSet, searchTerm, setSearchTerm, customSets, refreshCustomSets } = useSetContext();
    const [showSettings, setShowSettings] = useState(false);
    const [showCreateSet, setShowCreateSet] = useState(false);
    const [apiKey, setApiKey] = useState(localStorage.getItem('GEMINI_API_KEY') || '');
    const [setToDelete, setSetToDelete] = useState<CustomSet | null>(null);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);

    // Listen for PWA install prompt
    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallPrompt(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setShowInstallPrompt(false);
        }
        setDeferredPrompt(null);
    };

    const saveApiKey = () => {
        localStorage.setItem('GEMINI_API_KEY', apiKey);
        setShowSettings(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col items-center p-4 sm:p-8">
            {/* Hero gradient background */}
            <div className="fixed inset-0 bg-hero-gradient pointer-events-none" />

            <header className="relative w-full max-w-7xl mb-12 text-center">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-pokemon-blue via-pokemon-red to-pokemon-yellow tracking-tight"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                    TCG Master Set Gen
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-slate-400 mt-2 text-lg font-medium italic max-w-2xl mx-auto"
                >
                    Complete your binder organization <br />Built for collectors by a collector
                </motion.p>

                {!selectedSet && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-8 flex items-center justify-center gap-3"
                    >
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-pokemon-blue transition-colors" />
                            <input
                                type="text"
                                placeholder="Search sets..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-pokemon-blue/50 focus:border-pokemon-blue/30 outline-none transition-all w-64 text-sm font-medium"
                            />
                        </div>
                        <button
                            onClick={() => setShowCreateSet(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pokemon-blue/20 border border-pokemon-blue/30 hover:bg-pokemon-blue/30 transition-all text-pokemon-blue font-medium text-sm"
                        >
                            <FolderPlus className="w-4 h-4" />
                            <span className="hidden sm:inline">Create Set</span>
                        </button>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    </motion.div>
                )}
            </header>

            <main className="relative w-full max-w-7xl">
                {selectedSet ? (
                    <SetDetail set={selectedSet} onBack={() => setSelectedSet(null)} />
                ) : (
                    <>
                        {/* Custom Sets Section */}
                        {customSets.length > 0 && (
                            <section className="mb-12">
                                <div className="flex items-center gap-2 mb-6 ml-1">
                                    <FolderPlus className="w-5 h-5 text-pokemon-purple" />
                                    <h2 className="text-xl font-bold text-white tracking-wide">My Custom Sets</h2>
                                    <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-pokemon-purple/20 text-pokemon-purple rounded-full">
                                        {customSets.length}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                    {customSets.map((set) => (
                                        <motion.div
                                            key={set.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            whileHover={{ scale: 1.03, y: -5 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setSelectedSet(set)}
                                            className="relative group cursor-pointer rounded-2xl bg-gradient-to-br from-pokemon-purple/20 to-pokemon-blue/10 border border-pokemon-purple/30 p-6 shadow-card hover:shadow-card-hover transition-all"
                                        >
                                            {/* Delete button - appears on hover */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSetToDelete(set);
                                                }}
                                                className="absolute top-3 right-3 p-2 rounded-xl bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-all"
                                                title="Delete set"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>

                                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pokemon-purple/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-xl bg-pokemon-purple/20 flex items-center justify-center">
                                                    <Sparkles className="w-5 h-5 text-pokemon-purple" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-white group-hover:text-pokemon-purple transition-colors">{set.name}</h3>
                                                    <p className="text-xs text-slate-500">{set.series}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-400">
                                                <span><span className="font-bold text-white">{set.total}</span> Cards</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-600" />
                                                <span className="text-pokemon-purple/70">Custom</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Official Sets Section */}
                        <section>
                            <div className="flex items-center gap-2 mb-6 ml-1">
                                <Sparkles className="w-5 h-5 text-pokemon-yellow" />
                                <h2 className="text-xl font-bold text-white tracking-wide">Official Sets</h2>
                            </div>
                            <SetGrid />
                        </section>
                    </>
                )}
            </main>

            <footer className="relative mt-6 pt-6 pb-4 border-t border-white/5 w-full">
                <div className="max-w-6xl mx-auto px-4">
                    {/* Main footer grid - stacks on mobile, 3 columns on desktop */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        {/* Left: Branding */}
                        <div className="text-center md:text-left">
                            <p className="text-slate-400 text-sm font-medium">TCG Master Set Gen</p>
                            <p className="text-slate-600 text-xs">
                                Built with <span className="text-pokemon-red">&#x2764;</span> by Ren &copy; 2025
                            </p>
                        </div>

                        {/* Center: Support */}
                        <div className="flex flex-col items-center gap-1">
                            <p className="text-slate-500 text-xs hidden sm:block">Hope this helped! Keep this trainer caffeinated ☕</p>
                            <a
                                href="https://buymeacoffee.com/rendeveyra"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#FFDD00] hover:bg-[#FFDD00]/90 text-slate-900 font-bold text-sm rounded-full transition-all hover:scale-105 shadow-lg shadow-yellow-500/20"
                            >
                                <svg width="16" height="16" viewBox="0 0 100 100" className="shrink-0">
                                    <circle cx="50" cy="50" r="48" fill="#fff" stroke="#333" strokeWidth="4" />
                                    <path d="M2 50 H98" stroke="#333" strokeWidth="4" />
                                    <path d="M2 50 A48 48 0 0 1 98 50" fill="#E3350D" />
                                    <circle cx="50" cy="50" r="16" fill="#fff" stroke="#333" strokeWidth="4" />
                                    <circle cx="50" cy="50" r="8" fill="#333" />
                                </svg>
                                <span>Buy me a coffee</span>
                            </a>
                        </div>

                        {/* Right: Social Links */}
                        <div className="flex items-center justify-center md:justify-end gap-2">
                            <a
                                href="https://linkedin.com/in/warren-d-552224195"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg bg-white/5 hover:bg-[#0A66C2]/20 hover:text-[#0A66C2] text-slate-500 transition-all"
                                title="LinkedIn"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                            </a>
                            <a
                                href="https://web.facebook.com/ren.dev12/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg bg-white/5 hover:bg-[#1877F2]/20 hover:text-[#1877F2] text-slate-500 transition-all"
                                title="Facebook"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                            </a>
                            <a
                                href="https://github.com/warrendeveyra"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/20 hover:text-white text-slate-500 transition-all"
                                title="GitHub"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </footer>

            {/* PWA Install Prompt */}
            {showInstallPrompt && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="fixed bottom-4 right-4 z-[100] bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-2xl max-w-xs"
                >
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-pokemon-purple/20 flex items-center justify-center shrink-0">
                            <svg width="24" height="24" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="48" fill="#fff" stroke="#333" strokeWidth="4" />
                                <path d="M2 50 H98" stroke="#333" strokeWidth="4" />
                                <path d="M2 50 A48 48 0 0 1 98 50" fill="#E3350D" />
                                <circle cx="50" cy="50" r="16" fill="#fff" stroke="#333" strokeWidth="4" />
                                <circle cx="50" cy="50" r="8" fill="#333" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-white text-sm">Install App</h4>
                            <p className="text-slate-400 text-xs mt-0.5">Add to home screen for quick access</p>
                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={handleInstallClick}
                                    className="px-3 py-1.5 bg-pokemon-purple hover:bg-pokemon-purple/80 text-white text-xs font-bold rounded-lg transition-colors"
                                >
                                    Install
                                </button>
                                <button
                                    onClick={() => setShowInstallPrompt(false)}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-medium rounded-lg transition-colors"
                                >
                                    Not now
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 p-8 rounded-3xl shadow-2xl"
                    >
                        <h3 className="text-xl font-bold text-white mb-2">Settings</h3>
                        <p className="text-slate-400 text-sm mb-6">Configure your application preferences.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gemini API Key</label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Paste your API key here..."
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-pokemon-blue/50 outline-none transition-all text-sm text-white"
                                />
                                <p className="mt-2 text-[10px] text-slate-500">
                                    Your key is saved locally in your browser. Get one for free at <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-pokemon-blue hover:underline">Google AI Studio</a>.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveApiKey}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-pokemon-blue hover:bg-pokemon-blue/90 text-white font-semibold shadow-lg shadow-pokemon-blue/20 transition-all"
                            >
                                Save Changes
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Create Custom Set Modal */}
            <CreateCustomSetModal
                isOpen={showCreateSet}
                onClose={() => setShowCreateSet(false)}
                onCreated={() => refreshCustomSets()}
            />

            {/* Delete Set Confirmation Modal */}
            {setToDelete && (
                <div
                    className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setSetToDelete(null)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gradient-to-br from-slate-900 to-slate-950 border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center">
                            {/* Warning icon */}
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">Delete "{setToDelete.name}"?</h3>

                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                                <p className="text-red-400 text-sm font-medium mb-2">
                                    ⚠️ This action is IRREVERSIBLE
                                </p>
                                <p className="text-slate-400 text-sm">
                                    All {setToDelete.total} card(s) in this set will be permanently deleted.
                                    This cannot be undone.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSetToDelete(null)}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        deleteCustomSet(setToDelete.id);
                                        setSetToDelete(null);
                                        refreshCustomSets();
                                    }}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-all"
                                >
                                    Delete Forever
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

function App() {
    return (
        <SetProvider>
            <MainContent />
        </SetProvider>
    );
}

export default App;
