/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                pokemon: {
                    red: '#EE1515',
                    blue: '#3B4CCA',
                    yellow: '#FFDE00',
                    darkBlue: '#003A70',
                    gold: '#FFB800',
                    purple: '#7B2CBF',
                    green: '#2CB67D',
                },
                surface: {
                    50: 'rgba(255, 255, 255, 0.02)',
                    100: 'rgba(255, 255, 255, 0.05)',
                    200: 'rgba(255, 255, 255, 0.08)',
                    300: 'rgba(255, 255, 255, 0.12)',
                }
            },
            backgroundImage: {
                'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
                'premium-gradient': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                'card-shine': 'linear-gradient(135deg, transparent 40%, rgba(255, 255, 255, 0.1) 50%, transparent 60%)',
                'hero-gradient': 'radial-gradient(ellipse at 50% 0%, rgba(59, 76, 202, 0.15) 0%, transparent 50%)',
            },
            backdropBlur: {
                xs: '2px',
            },
            animation: {
                'shimmer': 'shimmer 2s linear infinite',
                'float': 'float 3s ease-in-out infinite',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                'slide-up': 'slide-up 0.5s ease-out',
                'fade-in': 'fade-in 0.3s ease-out',
            },
            keyframes: {
                shimmer: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'pulse-glow': {
                    '0%, 100%': { opacity: '1', boxShadow: '0 0 20px 0 rgba(59, 76, 202, 0.3)' },
                    '50%': { opacity: '0.8', boxShadow: '0 0 30px 5px rgba(59, 76, 202, 0.5)' },
                },
                'slide-up': {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
            },
            boxShadow: {
                'glow-blue': '0 0 20px 0 rgba(59, 76, 202, 0.3)',
                'glow-yellow': '0 0 20px 0 rgba(255, 222, 0, 0.3)',
                'glow-red': '0 0 20px 0 rgba(238, 21, 21, 0.3)',
                'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
                'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
            },
        },
    },
    plugins: [],
}
