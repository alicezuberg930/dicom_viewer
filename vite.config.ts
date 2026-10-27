import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { viteCommonjs } from '@originjs/vite-plugin-commonjs'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteCommonjs(), tailwindcss()],
  optimizeDeps: {
    exclude: ['@cornerstonejs/dicom-image-loader'],
    include: ['dicom-parser', 'events', 'url'],
  },
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      events: path.resolve(__dirname, './node_modules/events/events.js'),
      url: path.resolve(__dirname, './node_modules/url/url.js'),
    },
  },
})
