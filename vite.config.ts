import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
    base: command === 'serve' ? '/' : '/TcgPlaceholderGen/',
    plugins: [
        react(),
    ],
    resolve: {
        alias: {
            'react': path.resolve(__dirname, 'node_modules/react'),
            'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        },
    },
    server: {
        host: '127.0.0.1',
        port: 5173,
        strictPort: true,
        hmr: {
            protocol: 'ws',
            host: '127.0.0.1',
            port: 5173,
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
}))
