import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5180 },
  test: { testTimeout: 30000, hookTimeout: 30000 },
})
