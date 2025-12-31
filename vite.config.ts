import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    base: '/TcgPlaceholderGen/',
    plugins: [
        react(),
    ],
    server: {
        hmr: {
            // Fix WebSocket connection when using base path in dev mode
            path: '/ws',
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom'],
                    'vendor-jspdf': ['jspdf'],
                    'vendor-html2canvas': ['html2canvas'],
                    'vendor-ui': ['framer-motion', 'lucide-react'],
                    'vendor-utils': ['axios', '@google/genai', '@supabase/supabase-js'],
                },
            },
        },
    },
})
