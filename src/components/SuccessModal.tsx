import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    description?: string;
    primaryAction?: {
        label: string;
        onClick: () => void;
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
    accentColor?: 'green' | 'purple' | 'blue' | 'yellow';
}

const colorMap = {
    green: {
        bg: 'bg-pokemon-green/20',
        text: 'text-pokemon-green',
        border: 'border-pokemon-green/30',
        button: 'bg-pokemon-green hover:bg-pokemon-green/80',
        particle: '#22c55e',
    },
    purple: {
        bg: 'bg-pokemon-purple/20',
        text: 'text-pokemon-purple',
        border: 'border-pokemon-purple/30',
        button: 'bg-pokemon-purple hover:bg-pokemon-purple/80',
        particle: '#a855f7',
    },
    blue: {
        bg: 'bg-pokemon-blue/20',
        text: 'text-pokemon-blue',
        border: 'border-pokemon-blue/30',
        button: 'bg-pokemon-blue hover:bg-pokemon-blue/80',
        particle: '#3b82f6',
    },
    yellow: {
        bg: 'bg-pokemon-yellow/20',
        text: 'text-pokemon-yellow',
        border: 'border-pokemon-yellow/30',
        button: 'bg-pokemon-yellow hover:bg-pokemon-yellow/80',
        particle: '#eab308',
    },
};

// Particle component for confetti effect
const Particle: React.FC<{ color: string; delay: number; x: number; y: number }> = ({ color, delay, x, y }) => (
    <motion.div
        className="absolute w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
        initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        animate={{
            opacity: [1, 1, 0],
            scale: [0, 1.2, 0.5],
            x: x,
            y: y,
        }}
        transition={{
            duration: 0.8,
            delay: delay,
            ease: 'easeOut',
        }}
    />
);

// Animated checkmark with draw effect
const AnimatedCheck: React.FC<{ color: string }> = ({ color }) => (
    <motion.svg
        className="w-10 h-10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color }}
    >
        <motion.path
            d="M5 13l4 4L19 7"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
                pathLength: { duration: 0.5, ease: 'easeOut' },
                opacity: { duration: 0.2 },
            }}
        />
    </motion.svg>
);

const SuccessModal: React.FC<SuccessModalProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    description,
    primaryAction,
    secondaryAction,
    accentColor = 'green',
}) => {
    const colors = colorMap[accentColor];

    // Generate random particle positions
    const particles = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        delay: i * 0.05,
        x: (Math.random() - 0.5) * 120,
        y: (Math.random() - 0.5) * 120,
    }));

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: 'spring', duration: 0.4 }}
                        className={`bg-gradient-to-br from-slate-900 to-slate-950 border ${colors.border} rounded-2xl p-6 max-w-md w-full shadow-2xl`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center">
                            {/* Animated Success Icon with Particles */}
                            <div className="relative w-16 h-16 mx-auto mb-4">
                                {/* Particles */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    {particles.map((p) => (
                                        <Particle
                                            key={p.id}
                                            color={colors.particle}
                                            delay={p.delay}
                                            x={p.x}
                                            y={p.y}
                                        />
                                    ))}
                                </div>

                                {/* Pulsing ring */}
                                <motion.div
                                    className={`absolute inset-0 rounded-full ${colors.bg}`}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: [0.8, 1.3, 1], opacity: [0, 0.5, 0] }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                />

                                {/* Main circle */}
                                <motion.div
                                    className={`relative w-16 h-16 rounded-full ${colors.bg} flex items-center justify-center`}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', duration: 0.5, delay: 0.1 }}
                                >
                                    <AnimatedCheck color={colors.particle} />
                                </motion.div>
                            </div>

                            {/* Title */}
                            <motion.h3
                                className="text-xl font-bold text-white mb-2"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                {title}
                            </motion.h3>

                            {/* Content Box */}
                            {(subtitle || description) && (
                                <motion.div
                                    className={`${colors.bg} border ${colors.border} rounded-xl p-4 mb-6`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    {subtitle && (
                                        <p className="text-white font-medium mb-1">"{subtitle}"</p>
                                    )}
                                    {description && (
                                        <p className="text-slate-400 text-sm">{description}</p>
                                    )}
                                </motion.div>
                            )}

                            {/* Action Buttons */}
                            {(primaryAction || secondaryAction) && (
                                <motion.div
                                    className="flex gap-3"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    {secondaryAction && (
                                        <button
                                            onClick={secondaryAction.onClick}
                                            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-all"
                                        >
                                            {secondaryAction.label}
                                        </button>
                                    )}
                                    {primaryAction && (
                                        <button
                                            onClick={primaryAction.onClick}
                                            className={`flex-1 px-4 py-2.5 rounded-xl ${colors.button} text-white font-semibold transition-all`}
                                        >
                                            {primaryAction.label}
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SuccessModal;
