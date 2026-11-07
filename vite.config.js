import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const mock = (file) => fileURLToPath(new URL(`./dev/mock-firebase/${file}`, import.meta.url))

// https://vite.dev/config/
// `npm run demo` swaps Firebase for an in-memory stand-in so the page can be tried locally.
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: mode === 'demo' ? {
    alias: {
      'firebase/app': mock('app.js'),
      'firebase/auth': mock('auth.js'),
      'firebase/firestore': mock('firestore.js'),
    }
  } : {},
}))
