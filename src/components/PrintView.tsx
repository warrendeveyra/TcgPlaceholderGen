import React, { useState, useMemo } from 'react';
import { PokemonCard } from '../types/pokemon';
import { Download, FileText, Settings, X, Check, Sun, Moon, Palette, Type, Scissors } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CustomDropdown from './CustomDropdown';
import { generatePDF, PaperSize, Orientation } from '../services/pdfService';
import unoReverseSvg from '../assets/uno-reversesvg.svg';
import pokemonCardBack from '../assets/pokemon-card-back.png';

interface PrintViewProps {
    cards: PokemonCard[];
    onClose: () => void;
}

interface PrintSettings {
    watermarkType: 'art' | 'placeholder';
    isGrayscale: boolean;
    opacity: number;
    showTopText: boolean;
    showMiddleText: boolean;
    showBottomText: boolean;
    showCutLines: boolean;
    cutLineOpacity: number;
}

const PrintView: React.FC<PrintViewProps> = ({ cards, onClose }) => {
    const [pageSize, setPageSize] = useState<PaperSize>('a4');
    const [orientation, setOrientation] = useState<Orientation>('portrait');
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState<PrintSettings>({
        watermarkType: 'placeholder',
        isGrayscale: false,
        opacity: 12,
        showTopText: true,
        showMiddleText: true,
        showBottomText: true,
        showCutLines: true,
        cutLineOpacity: 100,
    });
    const [generating, setGenerating] = useState(false);

    const paperOptions = [
        { label: 'A4 (210 x 297mm)', value: 'a4' },
        { label: 'Letter (8.5 x 11in)', value: 'letter' },
        { label: 'Legal (8.5 x 14in)', value: 'legal' },
    ];

    const orientationOptions = [
        { label: 'Portrait', value: 'portrait' },
        { label: 'Landscape', value: 'landscape' },
    ];

    const watermarkOptions = [
        { label: 'Card Back', value: 'placeholder' },
        { label: 'Official Art', value: 'art' },
    ];

    // Local asset is imported as pokemonCardBack

    // Cards per page calculation
    const gridConfig = useMemo(() => {
        if (orientation === 'portrait') {
            return {
                cols: 3,
                rows: pageSize === 'legal' ? 4 : 3,
                cardsPerPage: pageSize === 'legal' ? 12 : 9
            };
        } else {
            // Landscape
            if (pageSize === 'legal') {
                return { cols: 5, rows: 2, cardsPerPage: 10 };
            } else {
                return { cols: 4, rows: 2, cardsPerPage: 8 };
            }
        }
    }, [pageSize, orientation]);

    const paperDimensions = useMemo(() => {
        const dims = {
            a4: { width: 210, height: 297 },
            letter: { width: 215.9, height: 279.4 },
            legal: { width: 215.9, height: 355.6 },
        };
        const current = dims[pageSize as keyof typeof dims];
        if (orientation === 'landscape') {
            return { width: `${current.height}mm`, height: `${current.width}mm` };
        }
        return { width: `${current.width}mm`, height: `${current.height}mm` };
    }, [pageSize, orientation]);

    const paginatedCards = useMemo(() => {
        const pages: PokemonCard[][] = [];
        for (let i = 0; i < cards.length; i += gridConfig.cardsPerPage) {
            pages.push(cards.slice(i, i + gridConfig.cardsPerPage));
        }
        return pages;
    }, [cards, gridConfig.cardsPerPage]);

    const handleDownloadPDF = async () => {
        setGenerating(true);
        try {
            await generatePDF('print-content', pageSize, orientation, `placeholders-${pageSize}-${orientation}.pdf`, { grayscale: settings.isGrayscale });
        } catch (err) {
            console.error('PDF generation error:', err);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 overflow-auto p-8 print:p-0 print:bg-white print:text-black">
            <header className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 gap-4 print:hidden max-w-[1400px] mx-auto">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-pokemon-blue/10 border border-pokemon-blue/20">
                        <FileText className="w-6 h-6 text-pokemon-blue" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white leading-none">
                            Print Preview
                        </h2>
                        <p className="text-slate-400 text-sm mt-1.5">Configure your placeholders for printing</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paper Size</span>
                        <CustomDropdown
                            options={paperOptions}
                            value={pageSize}
                            onChange={(val) => setPageSize(val as PaperSize)}
                            className="w-48"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Orientation</span>
                        <CustomDropdown
                            options={orientationOptions}
                            value={orientation}
                            onChange={(val) => setOrientation(val as Orientation)}
                            className="w-40"
                        />
                    </div>

                    <div className="h-8 w-px bg-white/10 hidden xl:block mx-2" />

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-slate-300 group"
                            title="Print Settings"
                        >
                            <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-slate-300 font-medium whitespace-nowrap"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDownloadPDF}
                            disabled={generating}
                            className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-pokemon-purple hover:bg-pokemon-purple/90 text-white font-bold shadow-lg shadow-pokemon-purple/20 transition-all disabled:opacity-50 whitespace-nowrap h-[42px]"
                        >
                            {generating ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Download className="w-5 h-5 text-white/90" />
                            )}
                            <span className="text-base tracking-wide">Download PDF</span>
                        </button>
                    </div>

                    <AnimatePresence>
                        {showSettings && (
                            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
                                >
                                    <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-pokemon-purple/10 to-transparent">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-pokemon-purple/20">
                                                <Settings className="w-5 h-5 text-pokemon-purple" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white tracking-tight">Advanced Settings</h3>
                                        </div>
                                        <button
                                            onClick={() => setShowSettings(false)}
                                            className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white"
                                        >
                                            <X className="w-6 h-6" />
                                        </button>
                                    </div>

                                    <div className="p-6 space-y-8 overflow-y-auto max-h-[70vh]">
                                        {/* Watermark Selection */}
                                        <section className="space-y-4">
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Palette className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase tracking-widest">Watermark Appearance</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                {watermarkOptions.map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => setSettings((prev: PrintSettings) => ({ ...prev, watermarkType: opt.value as any }))}
                                                        className={`px-4 py-3 rounded-2xl border-2 transition-all text-left relative overflow-hidden group ${settings.watermarkType === opt.value
                                                            ? 'border-pokemon-purple bg-pokemon-purple/10 text-white'
                                                            : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/10'
                                                            }`}
                                                    >
                                                        <span className="font-bold relative z-10">{opt.label}</span>
                                                        {settings.watermarkType === opt.value && (
                                                            <div className="absolute -right-2 -bottom-2 p-3 bg-pokemon-purple rounded-full">
                                                                <Check className="w-4 h-4 text-white" />
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Grayscale Toggle */}
                                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    {settings.isGrayscale ? <Moon className="w-5 h-5 text-slate-400" /> : <Sun className="w-5 h-5 text-amber-400" />}
                                                    <div>
                                                        <p className="font-bold text-white leading-none">
                                                            {settings.isGrayscale ? 'Grayscale Mode' : 'Color Mode'}
                                                        </p>
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            {settings.isGrayscale ? 'Saves color ink' : 'Uses official colors'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setSettings((prev: PrintSettings) => ({ ...prev, isGrayscale: !prev.isGrayscale }))}
                                                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.isGrayscale ? 'bg-pokemon-purple' : 'bg-slate-700'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.isGrayscale ? 'left-7' : 'left-1'}`} />
                                                </button>
                                            </div>

                                            {/* Opacity Slider */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-bold text-slate-300 uppercase tracking-wide">Opacity</span>
                                                    <span className="text-pokemon-purple font-mono font-bold">{settings.opacity}%</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="50"
                                                    value={settings.opacity}
                                                    onChange={(e) => setSettings((prev: PrintSettings) => ({ ...prev, opacity: parseInt(e.target.value) }))}
                                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pokemon-purple"
                                                />
                                            </div>
                                        </section>

                                        {/* Text Visibility */}
                                        <section className="space-y-4">
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Type className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase tracking-widest">Text Visibility</span>
                                            </div>

                                            <div className="grid gap-3">
                                                {[
                                                    { id: 'showTopText', label: 'Top "Placeholder" Label' },
                                                    { id: 'showMiddleText', label: 'Middle Card Info (Name/No.)' },
                                                    { id: 'showBottomText', label: 'Bottom Details (Rarity/Set)' }
                                                ].map((item) => (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => setSettings((prev: PrintSettings) => ({ ...prev, [item.id]: !prev[item.id as keyof PrintSettings] }))}
                                                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${settings[item.id as keyof PrintSettings]
                                                            ? 'bg-pokemon-blue/10 border-pokemon-blue/30 text-white'
                                                            : 'bg-white/5 border-white/5 text-slate-500'
                                                            }`}
                                                    >
                                                        <span className="font-bold">{item.label}</span>
                                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${settings[item.id as keyof PrintSettings]
                                                            ? 'bg-pokemon-blue border-pokemon-blue'
                                                            : 'border-white/20'
                                                            }`}>
                                                            {settings[item.id as keyof PrintSettings] && <Check className="w-4 h-4 text-white" />}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </section>

                                        {/* Cut Lines */}
                                        <section className="space-y-4">
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Scissors className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase tracking-widest">Cut Lines</span>
                                            </div>

                                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 h-6 border-2 border-dashed border-slate-400 rounded" />
                                                    <div>
                                                        <p className="font-bold text-white leading-none">
                                                            {settings.showCutLines ? 'Cut Lines Visible' : 'Cut Lines Hidden'}
                                                        </p>
                                                        <p className="text-xs text-slate-500 mt-1">Dashed border guides</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setSettings((prev: PrintSettings) => ({ ...prev, showCutLines: !prev.showCutLines }))}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.showCutLines ? 'bg-pokemon-purple' : 'bg-white/10'
                                                        }`}
                                                >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.showCutLines ? 'translate-x-6' : 'translate-x-1'
                                                        }`} />
                                                </button>
                                            </div>

                                            {settings.showCutLines && (
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Line Opacity</span>
                                                        <span className="text-sm font-bold text-pokemon-purple">{settings.cutLineOpacity}%</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="10"
                                                        max="100"
                                                        value={settings.cutLineOpacity}
                                                        onChange={(e) => setSettings((prev: PrintSettings) => ({ ...prev, cutLineOpacity: parseInt(e.target.value) }))}
                                                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pokemon-purple"
                                                    />
                                                </div>
                                            )}
                                        </section>
                                    </div>

                                    <div className="p-6 bg-slate-800/50 flex gap-3">
                                        <button
                                            onClick={() => setShowSettings(false)}
                                            className="grow py-3 rounded-2xl bg-pokemon-purple text-white font-bold shadow-lg shadow-pokemon-purple/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {/* Grid for Placeholders - Paginated */}
            <div id="print-content" className="flex flex-col items-center gap-8 print:gap-0">
                {paginatedCards.map((pageCards: PokemonCard[], pageIndex: number) => (
                    <div
                        key={pageIndex}
                        className="print-page bg-white shadow-2xl print:shadow-none flex flex-col items-center justify-center relative overflow-hidden"
                        style={{
                            ...paperDimensions,
                            breakAfter: 'page',
                            pageBreakAfter: 'always',
                            boxSizing: 'border-box',
                            margin: '0 auto'
                        }}
                    >
                        {/* Grid container with official Pokémon card spacing */}
                        <div
                            className="grid relative"
                            style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${gridConfig.cols}, 63.5mm)`,
                                gridTemplateRows: `repeat(${gridConfig.rows}, 88.9mm)`,
                                width: `${gridConfig.cols * 63.5}mm`,
                                height: `${gridConfig.rows * 88.9}mm`,
                                backgroundColor: 'white'
                            }}
                        >
                            {pageCards.map((card: PokemonCard, index: number) => (
                                <div
                                    key={index}
                                    className="relative flex items-center justify-center"
                                    style={{
                                        width: '63.5mm',
                                        height: '88.9mm',
                                        boxSizing: 'border-box',
                                        border: settings.showCutLines
                                            ? `1px dashed rgba(0, 0, 0, ${settings.cutLineOpacity / 100})`
                                            : 'none'
                                    }}
                                >
                                    {/* Background Watermark (Art or Card Back) */}
                                    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none flex items-center justify-center">
                                        {((settings.watermarkType === 'art' && card.images.small) || settings.watermarkType === 'placeholder') ? (
                                            <img
                                                src={settings.watermarkType === 'art' ? card.images.small : pokemonCardBack}
                                                alt=""
                                                key={`${card.id}-${settings.watermarkType}`}
                                                className={`w-full h-full object-cover transition-opacity duration-300 ${settings.isGrayscale ? 'grayscale contrast-[0.9]' : ''
                                                    }`}
                                                style={{ opacity: settings.opacity / 100 }}
                                                crossOrigin="anonymous"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    const fallback = e.currentTarget.parentElement?.querySelector('.art-fallback');
                                                    if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                                }}
                                            />
                                        ) : null}

                                        {/* Pokéball Fallback (Visible if no image or error) */}
                                        <div
                                            className={`art-fallback absolute inset-0 items-center justify-center ${(!card.images.small && settings.watermarkType === 'art') ? 'flex' : 'hidden'}`}
                                            style={{ opacity: settings.opacity / 100 }}
                                        >
                                            <div className={`relative w-32 h-32 ${settings.isGrayscale ? 'grayscale' : ''}`}>
                                                <div className="absolute inset-0 rounded-full border-4 border-slate-300/50 overflow-hidden bg-white/10">
                                                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-red-500/30" />
                                                    <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-white/20" />
                                                    <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-slate-400/50 -translate-y-1/2" />
                                                    <div className="absolute top-1/2 left-1/2 w-8 h-8 -translate-x-1/2 -translate-y-1/2 bg-white/80 rounded-full border-2 border-slate-400/50" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Reverse Holo Overlay */}
                                    {card.variation === 'Reverse' && (
                                        <img
                                            src={unoReverseSvg}
                                            alt="Reverse Holo"
                                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 opacity-25 pointer-events-none z-[5]"
                                        />
                                    )}

                                    <div className="z-10 text-center flex flex-col h-full justify-between py-4">
                                        {settings.showTopText ? (
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">
                                                Placeholder
                                            </p>
                                        ) : <div />}

                                        {settings.showMiddleText ? (
                                            <div className="flex-1 flex flex-col justify-center items-center gap-4">
                                                <h3 className="text-lg font-bold text-slate-800 leading-tight px-2 max-w-[55mm] break-words">
                                                    {card.name}
                                                </h3>
                                                <p className="text-sm font-medium text-slate-500">
                                                    #{card.number}
                                                </p>
                                            </div>
                                        ) : <div className="flex-1" />}

                                        {settings.showBottomText ? (
                                            <div className="flex flex-col gap-1.5 pb-2">
                                                <p className="text-[10px] font-bold text-pokemon-blue uppercase tracking-tight">
                                                    {card.variation === 'Reverse' ? 'Reverse Holo' : card.rarity}
                                                </p>
                                                <p className="text-[9px] text-slate-400 font-medium">
                                                    {card.set.name}
                                                </p>
                                            </div>
                                        ) : <div />}
                                    </div>

                                    {/* Corner Markers for easy alignment */}
                                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-slate-300" />
                                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-slate-300" />
                                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-slate-300" />
                                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-slate-300" />
                                </div>
                            ))}
                        </div>

                        {/* Page Indicator - Screen Only */}
                        <div className="absolute bottom-6 right-6 text-xs text-slate-300 font-bold print:hidden bg-slate-50/50 backdrop-blur-sm px-2 py-1 rounded-md border border-slate-100">
                            Page {pageIndex + 1} of {paginatedCards.length}
                        </div>
                    </div>
                ))}
            </div>

            <footer className="mt-8 mb-12 text-center text-slate-500 text-xs print:hidden">
                Official Card Dimensions: 63.5mm x 88.9mm. Best printed on cardstock at 100% scale.
            </footer>
        </div>
    );
};

export default PrintView;
