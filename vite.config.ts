import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Plugin to inject build timestamp into service worker
function swTimestampPlugin(): Plugin {
    const buildTimestamp = Date.now().toString(36); // Short unique ID
    return {
        name: 'sw-timestamp',
        generateBundle(_options, bundle) {
            // Find and modify the service worker file
            for (const fileName in bundle) {
                if (fileName === 'sw.js') {
                    const chunk = bundle[fileName];
                    if (chunk.type === 'asset' && typeof chunk.source === 'string') {
                        chunk.source = chunk.source.replace(
                            /__BUILD_TIMESTAMP__/g,
                            buildTimestamp
                        );
                        console.log(`[SW] Injected build timestamp: ${buildTimestamp}`);
                    }
                }
            }
        }
    };
}

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
    base: command === 'serve' ? '/' : '/TcgPlaceholderGen/',
    plugins: [
        react(),
        swTimestampPlugin(),
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

