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
})
