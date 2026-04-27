import React, { useState, useMemo, useEffect } from 'react';
import { useSetContext } from '../context/SetContext';
import SetCard from './SetCard';
import CustomDropdown from './CustomDropdown';
import { Loader2, ArrowUpDown, Search, Calendar, Grid3X3, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { translateSearchQuery } from '../services/translationService';

const SetGrid: React.FC = () => {
    const { sets, loading, translating, error, setSelectedSet, language, showEnglishNames } = useSetContext();

    const [searchQuery, setSearchQuery] = useState('');
    const [translatedQuery, setTranslatedQuery] = useState('');
    const [perPage, setPerPage] = useState<number>(24);
    const [currentPage, setCurrentPage] = useState(1);
    const [yearFrom, setYearFrom] = useState<number>(1999);
    const [yearTo, setYearTo] = useState<number | null>(null); // null = use max available
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    // Auto-translate English search query to Japanese when language is ja and translation is OFF
    useEffect(() => {
        const translateQuery = async () => {
            if (searchQuery.trim() && language === 'ja' && !showEnglishNames) {
                // Translate English query to Japanese to match original data
                const translated = await translateSearchQuery(searchQuery, 'ja');
                setTranslatedQuery(translated);
            } else {
                setTranslatedQuery('');
            }
        };

        // Debounce translation
        const timer = setTimeout(translateQuery, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, language, showEnglishNames]);


    // Get unique years from sets for dropdown options
    const availableYears = useMemo(() => {
        const years = sets
            .map(set => set.releaseDate ? parseInt(set.releaseDate.split('-')[0]) : null)
            .filter((y): y is number => y !== null);
        const uniqueYears = [...new Set(years)].sort((a, b) => a - b);
        return uniqueYears.length > 0 ? uniqueYears : Array.from({ length: 27 }, (_, i) => 1999 + i);
    }, [sets]);

    // Compute effective yearTo (use max available if null)
    const effectiveYearTo = yearTo ?? (availableYears.length > 0 ? availableYears[availableYears.length - 1] : new Date().getFullYear());

    // Apply filters and sorting
    const filteredSets = useMemo(() => {
        let result = [...sets];

        // Search filter - use both original query and translated query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const tq = translatedQuery.toLowerCase();
            result = result.filter(set => {
                const name = set.name.toLowerCase();
                const series = set.series.toLowerCase();
                const id = set.id.toLowerCase();
                const originalName = (set.originalName || '').toLowerCase();
                const originalSeries = (set.originalSeries || '').toLowerCase();
                const nameEn = (set.nameEn || '').toLowerCase();

                // Match against original query
                const matchesOriginal =
                    name.includes(q) ||
                    series.includes(q) ||
                    id.includes(q) ||
                    originalName.includes(q) ||
                    originalSeries.includes(q) ||
                    nameEn.includes(q);

                // Match against translated query (if available)
                const matchesTranslated = tq && (
                    name.includes(tq) ||
                    series.includes(tq) ||
                    originalName.includes(tq) ||
                    originalSeries.includes(tq)
                );

                return matchesOriginal || matchesTranslated;
            });
        }

        // Filter by year range
        result = result.filter(set => {
            if (!set.releaseDate) return true;
            const year = parseInt(set.releaseDate.split('-')[0]);
            return year >= yearFrom && year <= effectiveYearTo;
        });

        // Sort
        result.sort((a, b) => {
            const dateA = a.releaseDate || '';
            const dateB = b.releaseDate || '';
            return sortOrder === 'newest'
                ? dateB.localeCompare(dateA)
                : dateA.localeCompare(dateB);
        });

        return result;
    }, [sets, searchQuery, yearFrom, effectiveYearTo, sortOrder]);

    // Pagination
    const totalPages = Math.ceil(filteredSets.length / perPage);
    const paginatedSets = useMemo(() => {
        const start = (currentPage - 1) * perPage;
        return filteredSets.slice(start, start + perPage);
    }, [filteredSets, currentPage, perPage]);

    // Reset to page 1 when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, yearFrom, yearTo, sortOrder, perPage]);

    // Generate page numbers for pagination
    const getPageNumbers = () => {
        const pages: (number | '...')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                pages.push(i);
            }
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

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
        <div className="w-full">
            {/* Filter Bar */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-50 mb-6 p-4 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50"
            >
                {/* Translating indicator */}
                {translating && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pokemon-blue via-pokemon-yellow to-pokemon-blue animate-shimmer" />
                )}
                <div className="flex flex-wrap gap-3 items-center">
                    {/* Search */}
                    <div className="relative flex-grow min-w-[240px] max-w-[450px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-pokemon-yellow transition-colors" />
                        <label htmlFor="set-grid-search" className="sr-only">Search sets</label>
                        <input
                            id="set-grid-search"
                            name="set-grid-search"
                            type="text"
                            placeholder="Search official sets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-700/50 border border-slate-600 text-white text-sm rounded-xl pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-pokemon-yellow/50 focus:border-pokemon-yellow transition-all placeholder-slate-500"
                        />
                    </div>

                    <div className="h-6 w-px bg-slate-700 hidden sm:block" />

                    {/* Per Page */}
                    <div className="flex items-center gap-2">
                        <Grid3X3 className="w-4 h-4 text-slate-400" />
                        <CustomDropdown
                            value={perPage.toString()}
                            onChange={(v) => setPerPage(parseInt(v))}
                            options={[
                                { label: '12', value: '12' },
                                { label: '24', value: '24' },
                                { label: '48', value: '48' },
                                { label: '96', value: '96' },
                            ]}
                            className="w-20"
                        />
                    </div>

                    <div className="h-6 w-px bg-slate-700 hidden sm:block" />

                    {/* Year Range */}
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <CustomDropdown
                            value={yearFrom.toString()}
                            onChange={(v) => setYearFrom(parseInt(v))}
                            options={availableYears.map(y => ({ label: y.toString(), value: y.toString() }))}
                            className="w-24"
                        />
                        <span className="text-slate-500 text-sm">–</span>
                        <CustomDropdown
                            value={effectiveYearTo.toString()}
                            onChange={(v) => setYearTo(parseInt(v))}
                            options={availableYears.filter(y => y >= yearFrom).map(y => ({ label: y.toString(), value: y.toString() }))}
                            className="w-24"
                        />
                    </div>

                    <div className="h-6 w-px bg-slate-700 hidden sm:block" />

                    {/* Sort Toggle */}
                    <button
                        onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                        className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 hover:border-pokemon-yellow/50 text-white text-sm rounded-xl transition-all"
                    >
                        <ArrowUpDown className="w-4 h-4 text-pokemon-yellow" />
                        <span className="hidden sm:inline">{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
                    </button>

                    {/* Results count */}
                    <div className="ml-auto text-slate-500 text-sm hidden md:block">
                        {filteredSets.length} sets
                    </div>
                </div>
            </motion.div>

            {/* Set Grid */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 w-full"
            >
                {paginatedSets.map((set, index) => (
                    <motion.div
                        key={set.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.02 }}
                    >
                        <SetCard
                            set={set}
                            onClick={(set) => setSelectedSet(set)}
                        />
                    </motion.div>
                ))}
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-8 flex justify-center items-center gap-2"
                >
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex gap-1">
                        {getPageNumbers().map((page, i) => (
                            page === '...' ? (
                                <span key={`ellipsis-${i}`} className="px-3 py-2 text-slate-500">...</span>
                            ) : (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-all ${currentPage === page
                                        ? 'bg-pokemon-yellow text-slate-900'
                                        : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                                        }`}
                                >
                                    {page}
                                </button>
                            )
                        ))}
                    </div>

                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </motion.div>
            )}
        </div>
    );
};

export default SetGrid;
