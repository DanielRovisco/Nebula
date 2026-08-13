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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/Nebula">
      <App />
    </BrowserRouter>
  </StrictMode>,
)
