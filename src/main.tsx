import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

// Fontes servidas do próprio domínio em vez do Google Fonts: elimina a
// ligação a terceiros do caminho crítico e o CSS bloqueante que ela implicava.
// Só os pesos realmente usados — antes carregavam-se 7 de Poppins.
// Subset latino apenas — cobre todos os acentos do português e evita declarar
// cirílico, devanágari e vietnamita que nunca serão usados.
import '@fontsource/poppins/latin-400.css'
import '@fontsource/poppins/latin-600.css'
import '@fontsource-variable/montserrat/wght.css'
import '@fontsource/cormorant-garamond/latin-300-italic.css'
import '@fontsource/cormorant-garamond/latin-400-italic.css'

import './index.css'
import App from './App.tsx'
import site from '../site.config.json'

// O router não quer a barra final que o Vite exige no `base`.
const BASENAME = site.base.replace(/\/$/, '')

/*
  Chegar aqui significa que o ficheiro de entrada carregou. Limpa a marca que o
  index.html deixa quando recarrega por causa de HTML velho em cache, para a
  próxima vez que isso acontecer haver outra vez direito a uma recarga. Sem
  isto, a rede de segurança valia uma vez na vida do separador.
*/
try {
  sessionStorage.removeItem('nebula-recarga-entrada')
} catch { /* sem sessionStorage não há marca para limpar */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={BASENAME}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
