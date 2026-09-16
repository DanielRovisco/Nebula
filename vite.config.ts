import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import site from './site.config.json' with { type: 'json' }
import larguras from './src/lib/imagens.json' with { type: 'json' }

/*
  O preload do hero, escrito a partir das larguras que existem mesmo.

  O index.html traz um `<link rel="preload">` para a imagem de entrada, porque
  ela é desenhada pelo React e o browser não a descobre sozinho a tempo. Esse
  preload tem de anunciar exactamente as mesmas larguras que o <picture> vai
  oferecer: se anunciar menos, o browser descarrega a maior que este preload
  conhece e depois a que o <picture> escolheu — duas imagens grandes em vez de
  uma, no elemento que decide a velocidade da página.

  Estava escrito à mão nos dois sítios. À mão, isto desencontra-se na primeira
  fotografia de entrada que for substituída por uma maior, e o sintoma é uma
  página mais lenta sem nada de errado à vista. Agora sai do mesmo ficheiro que
  o <Picture> lê.
*/
const HERO = 'hero-beach-dress'

function preloadDoHero() {
  const w: number[] = (larguras as Record<string, number[]>)[HERO] ?? [480, 960, 1440]
  const caminho = (n: number) => `${site.base}brand/portfolio/${HERO}-${n}.avif`
  return {
    name: 'nebula-preload-hero',
    transformIndexHtml(html: string) {
      return html
        .replace(
          /imagesrcset="[^"]*"/,
          `imagesrcset="${w.map((n) => `${caminho(n)} ${n}w`).join(', ')}"`,
        )
        .replace(/href="[^"]*hero-beach-dress-\d+\.avif"/, `href="${caminho(w[w.length - 1])}"`)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), preloadDoHero()],
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
