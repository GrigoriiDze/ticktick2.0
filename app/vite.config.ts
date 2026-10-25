import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase')) return 'vendor-firebase'
          if (id.includes('node_modules/@tiptap') || id.includes('node_modules/prosemirror')) return 'vendor-editor'
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor-react'
        },
      },
    },
  },
  server: { host: true, port: 5180 },
  test: { testTimeout: 30000, hookTimeout: 30000 },
})
