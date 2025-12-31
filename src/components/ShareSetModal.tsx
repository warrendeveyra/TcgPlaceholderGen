import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import { X, Copy, Check, Share2 } from 'lucide-react';

interface ShareSetModalProps {
    isOpen: boolean;
    onClose: () => void;
    shareUrl: string;
    setName: string;
}

const ShareSetModal: React.FC<ShareSetModalProps> = ({ isOpen, onClose, shareUrl, setName }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-slate-900 to-slate-950 border border-pokemon-purple/30 rounded-2xl p-6 max-w-md w-full shadow-2xl"
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
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-pokemon-purple/20 flex items-center justify-center">
                        <Share2 className="w-7 h-7 text-pokemon-purple" />
                    </div>

                    <h3 className="text-xl font-bold text-white mb-1">Share Your Set</h3>
                    <p className="text-slate-400 text-sm mb-6">"{setName}"</p>

                    {/* QR Code */}
                    <div className="bg-white p-4 rounded-xl inline-block mb-6">
                        <QRCodeSVG
                            value={shareUrl}
                            size={180}
                            level="M"
                            includeMargin={false}
                        />
                    </div>

                    {/* Share URL */}
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3 mb-6">
                        <label htmlFor="share-url" className="sr-only">Share URL</label>
                        <input
                            id="share-url"
                            name="share-url"
                            type="text"
                            value={shareUrl}
                            readOnly
                            className="flex-1 bg-transparent text-sm text-slate-300 outline-none truncate"
                        />
                        <button
                            onClick={handleCopy}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${copied
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-pokemon-purple/20 hover:bg-pokemon-purple/30 text-pokemon-purple'
                                }`}
                        >
                            {copied ? (
                                <span className="flex items-center gap-1">
                                    <Check className="w-4 h-4" /> Copied!
                                </span>
                            ) : (
                                <span className="flex items-center gap-1">
                                    <Copy className="w-4 h-4" /> Copy
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Info */}
                    <p className="text-slate-500 text-xs">
                        Anyone with this link can import a copy of your set.<br />
                        Link expires in 30 days.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default ShareSetModal;
