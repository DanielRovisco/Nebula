import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import site from './site.config.json' with { type: 'json' }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Vem do site.config.json, tal como o basename do router e o SITE_URL: mudar
  // de domínio tem de ser uma alteração num sítio só, não uma caça a seis.
  base: site.base,
  build: {
    rollupOptions: {
      output: {
        // Dependências estáveis em chunks próprios: mudar texto de uma página
        // não invalida o cache do React nem do framer-motion nos visitantes
        // que regressam.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) {
            return 'motion'
          }
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'react'
          }
        },
      },
    },
  },
})
