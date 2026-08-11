// Resolve caminhos de ficheiros em public/ contra a base do Vite (`/Nebula/` em produção).
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
