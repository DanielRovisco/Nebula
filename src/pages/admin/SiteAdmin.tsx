import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Eye, EyeOff, Maximize2, Play, Plus, Trash2, Upload } from 'lucide-react'
import { useArrastar } from './useArrastar'
import { ehVideo } from '../../lib/site-content/types'
import { siteAdmin, publicUrl, uploadSitePhoto, uploadSiteVideo, SITE_EDGE } from '../../lib/site-content/api'
import type { ServiceCover, SiteCategory, SitePhoto, Testimonial } from '../../lib/site-content/types'
import { DEMO } from '../../lib/gallery/config'
import { slugify } from '../../lib/gallery/helpers'
import { asset } from '../../lib/asset'
import { HERO_ID } from '../../lib/servicosCapas'

const field =
  'w-full bg-transparent border-b border-white/15 py-2.5 outline-none focus:border-titanium/60 transition-colors placeholder:text-titanium/25'

/** Em demonstração as imagens vêm do próprio portfólio do site. */
const thumbUrl = (p: SitePhoto) =>
  DEMO
    ? asset(`/brand/portfolio/${(p.thumbKey ?? '').split('/').pop()}`)
    : publicUrl(p.thumbKey ?? p.storageKey)

/*
  Os quatro serviços, na ordem em que aparecem na página.

  Repetidos aqui e não importados de Services.tsx de propósito: aquela lista
  traz a estrutura dos packs e as fotografias do repositório, e importá-la para
  o painel arrastava a página pública inteira para dentro do pacote do
  administrador. O que o painel precisa é só do identificador e de um nome
  legível.

  Se um dia se acrescentar um serviço, entra nos dois sítios. É o preço de não
  os cruzar, e são quatro linhas.
*/
const SERVICOS = [
  {
    id: HERO_ID,
    nome: 'Entrada da página inicial',
    // A única que não é um serviço, e a que mais se vê: é o primeiro ecrã de
    // quem chega ao site.
    nota: 'A fotografia grande que abre o site',
  },
  { id: 'casamentos', nome: 'Casamentos' },
  { id: 'maternidade', nome: 'Maternidade' },
  { id: 'retratos', nome: 'Retratos' },
  { id: 'eventos', nome: 'Eventos' },
] as const

export default function SiteAdmin() {
  const [categories, setCategories] = useState<SiteCategory[]>([])
  const [photos, setPhotos] = useState<SitePhoto[]>([])
  const [testemunhos, setTestemunhos] = useState<Testimonial[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [upload, setUpload] = useState<{ done: number; total: number } | null>(null)
  const [novaCategoria, setNovaCategoria] = useState('')
  const [tick, setTick] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)

  /*
    Capas dos serviços, por serviço. Guardadas em objeto e não em lista porque
    é sempre por serviço que se pergunta, e uma lista obrigava a procurar de
    cada vez que se desenha uma linha.
  */
  const [capas, setCapas] = useState<Record<string, ServiceCover>>({})
  const [aCarregarCapa, setACarregarCapa] = useState<string | null>(null)
  const capaInputs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    let vivo = true
    Promise.all([
      siteAdmin.listCategories(),
      siteAdmin.listPhotos(),
      siteAdmin.listTestimonials(),
      siteAdmin.listServiceCovers(),
    ])
      .then(([c, p, t, cv]) => {
        if (!vivo) return
        setCategories(c)
        setPhotos(p)
        setTestemunhos(t)
        setCapas(Object.fromEntries(cv.map((x) => [x.serviceId, x])))
      })
      .catch((e) => vivo && setError((e as Error).message))
    return () => {
      vivo = false
    }
  }, [tick])

  const recarregar = useCallback(() => setTick((t) => t + 1), [])

  function flash(m: string) {
    setNotice(m)
    setTimeout(() => setNotice(null), 2500)
  }

  const guardar = async (fn: () => Promise<unknown>, msg = 'Guardado.') => {
    setError(null)
    try {
      await fn()
      flash(msg)
      recarregar()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return
    const files = Array.from(list).filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/'),
    )
    if (!files.length) return
    setError(null)
    setUpload({ done: 0, total: files.length })
    let ordem = photos.length
    try {
      for (const file of files) {
        // O vídeo sobe inteiro e leva um fotograma por miniatura; a fotografia
        // é redimensionada. O tipo do ficheiro decide, e fica guardado — é o
        // que faz a grelha saber o que há de mostrar.
        const up = file.type.startsWith('video/')
          ? await uploadSiteVideo(file)
          : await uploadSitePhoto(file)
        await siteAdmin.addPhoto({
          ...up,
          thumbKey: up.thumbKey,
          categoryId: categories[0]?.id ?? null,
          // Nome do ficheiro como ponto de partida — é melhor do que vazio, e o
          // texto alternativo é editável logo abaixo de cada foto.
          alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          contentType: up.contentType,
          sortOrder: ordem++,
        })
        setUpload((u) => (u ? { ...u, done: u.done + 1 } : null))
      }
      flash(`${files.length} ${files.length === 1 ? 'ficheiro adicionado' : 'ficheiros adicionados'}.`)
      recarregar()
    } catch (e) {
      setError((e as Error).message)
      recarregar()
    } finally {
      setUpload(null)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  /**
   * Troca a capa de um serviço.
   *
   * Reaproveita o mesmo upload das fotografias do portfólio: sobe para o
   * bucket público e é reduzida no browser antes de ir. Não faz sentido ter
   * dois caminhos de upload no mesmo painel, e este já trata do
   * redimensionamento e da miniatura.
   *
   * O recorte começa ao centro. Quem quiser afiná-lo tem os botões por baixo:
   * a capa é cortada em 3:4 e uma cara a dois terços da altura desaparecia.
   */
  async function trocarCapa(serviceId: string, file: File) {
    setError(null)
    setACarregarCapa(serviceId)
    try {
      const up = await uploadSitePhoto(file)
      const cover: ServiceCover = {
        serviceId,
        storageKey: up.storageKey,
        alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        pos: capas[serviceId]?.pos ?? '50% 50%',
      }
      await siteAdmin.setServiceCover(cover)
      setCapas((c) => ({ ...c, [serviceId]: cover }))
      flash('Capa trocada.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setACarregarCapa(null)
      const el = capaInputs.current[serviceId]
      if (el) el.value = ''
    }
  }

  /** Guarda um campo da capa sem voltar a carregar o ficheiro. */
  async function ajustarCapa(serviceId: string, patch: Partial<ServiceCover>) {
    const atual = capas[serviceId]
    if (!atual) return
    const nova = { ...atual, ...patch }
    setCapas((c) => ({ ...c, [serviceId]: nova }))
    try {
      await siteAdmin.setServiceCover(nova)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  /**
   * Repõe a fotografia que vem no repositório.
   *
   * Só apaga a linha; o ficheiro fica no bucket. Apagá-lo daria jeito ao
   * espaço mas arriscava deixar uma capa a apontar para o vazio se a mesma
   * fotografia estivesse a ser usada noutro sítio, e uma página com um buraco
   * é pior do que uns megabytes a mais.
   */
  async function reporCapa(serviceId: string) {
    setError(null)
    try {
      await siteAdmin.clearServiceCover(serviceId)
      setCapas((c) => {
        const n = { ...c }
        delete n[serviceId]
        return n
      })
      flash('Reposta a fotografia original.')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // Fotografia com os campos abertos por baixo da grelha. Uma de cada vez.
  const [aberta, setAberta] = useState<string | null>(null)

  function mover(from: number, to: number) {
    if (to < 0 || to >= photos.length) return
    const next = [...photos]
    const [m] = next.splice(from, 1)
    next.splice(to, 0, m)
    setPhotos(next)
    siteAdmin.reorderPhotos(next.map((p) => p.id)).catch((e) => setError((e as Error).message))
  }

  const { aArrastar, propsDe } = useArrastar(mover)

  /** "50% 30%" → { x: 50, y: 30 }. Aceita o formato antigo com palavras. */
  function eixo(pos: string) {
    const [x, y] = (pos || '50% 50%').split(/\s+/)
    const n = (v: string, palavra: Record<string, number>) =>
      v?.endsWith('%') ? Number(v.slice(0, -1)) : (palavra[v] ?? 50)
    return {
      x: n(x, { left: 0, center: 50, right: 100 }),
      y: n(y, { top: 0, center: 50, bottom: 100 }),
    }
  }

  /*
    O cursor mexe-se em tempo real e só grava ao largar. Gravar a cada passo
    seria uma escrita na base de dados por pixel arrastado — e a última a
    chegar podia não ser a última a ser enviada, deixando um valor que já não
    é o que está no ecrã.
  */
  function setPos(foto: SitePhoto, x: number, y: number) {
    setPhotos((atuais) =>
      atuais.map((f) => (f.id === foto.id ? { ...f, pos: `${x}% ${y}%` } : f)),
    )
  }

  function gravarPos(foto: SitePhoto) {
    const atual = photos.find((f) => f.id === foto.id)
    if (atual) guardar(() => siteAdmin.updatePhoto(foto.id, { pos: atual.pos }))
  }

  function moverTestemunho(from: number, to: number) {
    if (to < 0 || to >= testemunhos.length) return
    const next = [...testemunhos]
    const [m] = next.splice(from, 1)
    next.splice(to, 0, m)
    setTestemunhos(next)
    siteAdmin.reorderTestimonials(next.map((t) => t.id)).catch((e) => setError((e as Error).message))
  }

  return (
    <div className="container-px">
      <h1 className="text-3xl sm:text-4xl mb-2">Site</h1>
      <p className="text-sm text-titanium/45 mb-10 max-w-2xl leading-relaxed">
        O que aqui mudares aparece no site sem precisar de deploy. Enquanto não
        houver fotos carregadas, o portfólio continua a mostrar as que estão no
        código. O site nunca fica vazio.
      </p>

      {notice && <p className="text-xs text-emerald-300/80 mb-5">{notice}</p>}
      {error && (
        <p role="alert" className="text-sm text-titanium/75 border border-white/15 rounded-xl p-4 mb-6">
          {error}
        </p>
      )}

      {/* ── Categorias ──────────────────────────────────────── */}
      <section className="mb-14 max-w-2xl">
        <h2 className="text-xl mb-2">Categorias do portfólio</h2>
        <p className="text-xs text-titanium/35 mb-6 leading-relaxed">
          São os filtros que aparecem por cima da grelha. Apagar uma categoria
          não apaga as fotos: ficam sem categoria à espera de nova.
        </p>

        <ul className="border border-white/10 rounded-2xl divide-y divide-white/[0.07] mb-5 overflow-hidden">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-5 py-3">
              <input
                defaultValue={c.label}
                onBlur={(e) =>
                  e.target.value !== c.label &&
                  e.target.value.trim() &&
                  guardar(() => siteAdmin.updateCategory(c.id, e.target.value.trim()))
                }
                className="flex-1 bg-transparent outline-none text-sm focus:text-titanium"
              />
              <span className="text-xs text-titanium/25">
                {photos.filter((p) => p.categoryId === c.id).length} fotos
              </span>
              <button
                onClick={() =>
                  window.confirm(`Apagar a categoria "${c.label}"?`) &&
                  guardar(() => siteAdmin.deleteCategory(c.id), 'Categoria apagada.')
                }
                aria-label={`Apagar ${c.label}`}
                className="p-2 text-titanium/30 hover:text-red-300 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
          {categories.length === 0 && (
            <li className="px-5 py-4 text-sm text-titanium/35">Sem categorias.</li>
          )}
        </ul>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            const label = novaCategoria.trim()
            if (!label) return
            guardar(() => siteAdmin.createCategory(label, slugify(label)), 'Categoria criada.')
            setNovaCategoria('')
          }}
          className="flex items-end gap-3"
        >
          <div className="flex-1">
            <label className="label-sm block mb-2.5" htmlFor="nova-cat">Nova categoria</label>
            <input
              id="nova-cat"
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value)}
              className={field}
              placeholder="Ex. Batizados"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 border border-white/20 px-5 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] text-titanium/75 hover:border-white/40 transition-all min-h-[44px]"
          >
            <Plus size={14} /> Adicionar
          </button>
        </form>
      </section>

      {/* ── Fotos do portfólio ──────────────────────────────── */}
      <section className="mb-14">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-2">
          <h2 className="text-xl">
            Fotos do portfólio <span className="text-titanium/35 text-base">({photos.length})</span>
          </h2>
          <button
            onClick={() => fileInput.current?.click()}
            disabled={Boolean(upload)}
            className="inline-flex items-center gap-2.5 bg-titanium text-eerie px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] font-semibold active:scale-95 transition-all min-h-[44px] disabled:opacity-60 disabled:cursor-wait"
          >
            <Upload size={14} />
            {upload ? `A enviar ${upload.done}/${upload.total}` : 'Adicionar fotos'}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
        <p className="text-xs text-titanium/35 mb-6 leading-relaxed">
          Reduzidas para {SITE_EDGE}px no upload. Numa página pública o peso
          das imagens é o que separa um site rápido de um lento.
        </p>

        {upload && (
          <div className="h-px bg-white/10 mb-6 overflow-hidden">
            <div
              className="h-full bg-titanium transition-[width] duration-300"
              style={{ width: `${Math.round((upload.done / upload.total) * 100)}%` }}
            />
          </div>
        )}

        {photos.length === 0 ? (
          <div className="border border-dashed border-white/15 rounded-2xl p-12 text-center">
            <Upload size={24} className="mx-auto text-titanium/25 mb-4" />
            <p className="text-sm text-titanium/45">
              Sem fotos carregadas. O site mostra as que estão no código.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-titanium/40 mb-4">
              Arrasta para reordenar, ou usa as setas. O arrasto não funciona
              ao toque. Clica numa fotografia para lhe editar a categoria e a
              descrição.
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
              {photos.map((p, i) => (
                <div
                  key={p.id}
                  {...propsDe(i)}
                  className={`relative group rounded-lg overflow-hidden aspect-square bg-white/[0.04] cursor-grab active:cursor-grabbing ${
                    aArrastar === i ? 'opacity-40' : ''
                  } ${p.published ? '' : 'opacity-50'} ${
                    aberta === p.id ? 'ring-2 ring-titanium/70' : ''
                  }`}
                >
                  <button
                    onClick={() => setAberta(aberta === p.id ? null : p.id)}
                    aria-label={`Editar ${p.alt || 'fotografia'}`}
                    aria-expanded={aberta === p.id}
                    className="absolute inset-0 w-full h-full"
                  >
                    <img
                      src={thumbUrl(p)}
                      alt={p.alt}
                      loading="lazy"
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  </button>
                  <div className="absolute inset-0 bg-eerie/0 group-hover:bg-eerie/40 transition-colors pointer-events-none" />
                  {ehVideo(p) && (
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="w-8 h-8 rounded-full bg-eerie/60 flex items-center justify-center">
                        <Play size={12} className="text-titanium ml-0.5" fill="currentColor" />
                      </span>
                    </span>
                  )}

                  {/* Setas: é o que resta a quem está no telemóvel ou no teclado. */}
                  <div className="absolute bottom-1 left-1 flex gap-1">
                    <button
                      onClick={() => mover(i, i - 1)}
                      disabled={i === 0}
                      aria-label="Mover para trás"
                      className="p-1.5 rounded-full bg-eerie/70 text-titanium/80 hover:text-titanium disabled:opacity-0"
                    >
                      <ChevronLeft size={12} />
                    </button>
                    <button
                      onClick={() => mover(i, i + 1)}
                      disabled={i === photos.length - 1}
                      aria-label="Mover para a frente"
                      className="p-1.5 rounded-full bg-eerie/70 text-titanium/80 hover:text-titanium disabled:opacity-0"
                    >
                      <ChevronRight size={12} />
                    </button>
                  </div>

                  <div className="absolute top-1 right-1 flex gap-1">
                    <button
                      onClick={() => guardar(() => siteAdmin.updatePhoto(p.id, { tall: !p.tall }))}
                      title="Ocupar duas linhas na grelha do site"
                      aria-label="Alternar destaque"
                      className={`p-1.5 rounded-full bg-eerie/70 transition-colors ${
                        p.tall ? 'text-amber-300' : 'text-titanium/60 hover:text-titanium'
                      }`}
                    >
                      <Maximize2 size={12} />
                    </button>
                    <button
                      onClick={() => guardar(() => siteAdmin.updatePhoto(p.id, { published: !p.published }))}
                      aria-label={p.published ? 'Esconder do site' : 'Mostrar no site'}
                      className="p-1.5 rounded-full bg-eerie/70 text-titanium/60 hover:text-titanium transition-colors"
                    >
                      {p.published ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                    <button
                      onClick={() =>
                        window.confirm('Apagar esta foto do portfólio?') &&
                        guardar(() => siteAdmin.deletePhoto(p.id), 'Foto apagada.')
                      }
                      aria-label="Apagar foto"
                      className="p-1.5 rounded-full bg-eerie/70 text-titanium/60 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/*
              A edição vive fora da grelha, e não dentro de cada cartão: com os
              campos por baixo de cada miniatura, catorze fotografias enchiam
              três ecrãs e reordenar obrigava a percorrer tudo. Assim vê-se a
              ordem toda de uma vez, e edita-se uma de cada vez.
            */}
            {(() => {
              const p = photos.find((x) => x.id === aberta)
              if (!p) return null
              return (
                <div className="mt-4 border border-white/15 rounded-xl p-4 grid sm:grid-cols-[13rem_1fr] gap-4 items-start">
                  <div>
                    {/*
                      A pré-visualização mostra o corte a sério, com a mesma
                      regra da grelha do site. Sem isto ajustava-se às cegas:
                      os números não dizem nada, e o que se quer saber é se a
                      cara ficou dentro.
                    */}
                    <div className="w-full aspect-square rounded-lg overflow-hidden bg-white/[0.04]">
                      <img
                        src={thumbUrl(p)}
                        alt=""
                        style={{ objectPosition: p.pos }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <label className="label-sm block mt-3 mb-1" htmlFor={`px-${p.id}`}>
                      Recorte horizontal
                    </label>
                    <input
                      id={`px-${p.id}`}
                      type="range"
                      min={0}
                      max={100}
                      value={eixo(p.pos).x}
                      onChange={(e) => setPos(p, Number(e.target.value), eixo(p.pos).y)}
                      onPointerUp={() => gravarPos(p)}
                      onKeyUp={() => gravarPos(p)}
                      className="w-full accent-titanium"
                    />
                    <label className="label-sm block mt-2 mb-1" htmlFor={`py-${p.id}`}>
                      Recorte vertical
                    </label>
                    <input
                      id={`py-${p.id}`}
                      type="range"
                      min={0}
                      max={100}
                      value={eixo(p.pos).y}
                      onChange={(e) => setPos(p, eixo(p.pos).x, Number(e.target.value))}
                      onPointerUp={() => gravarPos(p)}
                      onKeyUp={() => gravarPos(p)}
                      className="w-full accent-titanium"
                    />
                    <p className="text-[10px] text-titanium/40 mt-1.5">
                      Só afecta a miniatura na grelha. A fotografia aberta em
                      grande mostra-se sempre inteira.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="label-sm block mb-1.5" htmlFor={`cat-${p.id}`}>Categoria</label>
                      <select
                        id={`cat-${p.id}`}
                        value={p.categoryId ?? ''}
                        onChange={(e) =>
                          guardar(() => siteAdmin.updatePhoto(p.id, { categoryId: e.target.value || null }))
                        }
                        className={`${field} bg-eerie text-sm py-1.5`}
                      >
                        <option value="">Sem categoria</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label-sm block mb-1.5" htmlFor={`alt-${p.id}`}>Descrição da imagem</label>
                      <input
                        id={`alt-${p.id}`}
                        defaultValue={p.alt}
                        onBlur={(e) =>
                          e.target.value !== p.alt &&
                          guardar(() => siteAdmin.updatePhoto(p.id, { alt: e.target.value }))
                        }
                        className={`${field} text-sm py-1.5`}
                        placeholder="Retrato editorial em estúdio"
                      />
                      <p className="text-[10px] text-titanium/40 mt-1.5">
                        Lida por quem não vê a imagem, e pelo Google.
                      </p>
                    </div>
                  </div>
                </div>
              )
            })()}
          </>
        )}
      </section>

      {/* ── Capas dos serviços ──────────────────────────────── */}
      <section className="mb-14">
        <h2 className="text-xl mb-1">Fotografias do site</h2>
        <p className="text-titanium/45 text-xs mb-6 max-w-xl leading-relaxed">
          A que abre o site e a de cada serviço. As dos serviços aparecem nos
          cartões da página inicial e na página de serviços ao mesmo tempo. Sem
          nada carregado, fica a que vem no site. Melhor ao alto: são mostradas
          em 3:4.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {SERVICOS.map((sv) => {
            const capa = capas[sv.id]
            const ocupado = aCarregarCapa === sv.id
            return (
              <div key={sv.id} className="border border-white/10 rounded-xl p-4">
                <p className="label-sm">{sv.nome}</p>
                {'nota' in sv && (
                  <p className="text-[10px] text-titanium/35 mb-2 mt-0.5">{sv.nota}</p>
                )}
                <div className={'nota' in sv ? 'mb-2' : 'mb-3'} />

                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-white/[0.04] mb-3">
                  {capa ? (
                    <img
                      src={publicUrl(capa.storageKey)}
                      alt=""
                      style={{ objectPosition: capa.pos }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-center px-3">
                      <span className="text-titanium/35 text-[11px] leading-relaxed">
                        A usar a fotografia do site
                      </span>
                    </div>
                  )}
                </div>

                {/*
                  O recorte só aparece quando há capa carregada. A do site tem
                  o enquadramento afinado no código, e dar aqui um controlo que
                  não faz nada seria pior do que não o dar.
                */}
                {capa && (
                  <div className="flex items-center gap-1 mb-3">
                    <span className="text-[10px] text-titanium/40 mr-1">Recorte</span>
                    {(
                      [
                        ['Topo', '50% 0%'],
                        ['Centro', '50% 50%'],
                        ['Base', '50% 100%'],
                      ] as const
                    ).map(([rotulo, valor]) => (
                      <button
                        key={valor}
                        onClick={() => ajustarCapa(sv.id, { pos: valor })}
                        className={`text-[10px] px-2 py-1.5 rounded-md border transition-colors min-h-[32px] ${
                          capa.pos === valor
                            ? 'border-white/35 text-titanium'
                            : 'border-white/10 text-titanium/50 hover:text-titanium/80'
                        }`}
                      >
                        {rotulo}
                      </button>
                    ))}
                  </div>
                )}

                <input
                  ref={(el) => {
                    capaInputs.current[sv.id] = el
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void trocarCapa(sv.id, f)
                  }}
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => capaInputs.current[sv.id]?.click()}
                    disabled={ocupado}
                    className="text-[11px] uppercase tracking-[0.15em] border border-white/15 rounded-full px-4 py-2 text-titanium/75 hover:text-titanium hover:border-white/35 transition-colors min-h-[36px] disabled:opacity-50 disabled:cursor-wait"
                  >
                    {ocupado ? 'A enviar…' : capa ? 'Trocar' : 'Escolher foto'}
                  </button>
                  {capa && (
                    <button
                      onClick={() => reporCapa(sv.id)}
                      className="text-[11px] uppercase tracking-[0.15em] text-titanium/45 hover:text-titanium/75 transition-colors min-h-[36px] px-2"
                    >
                      Repor
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Testemunhos ─────────────────────────────────────── */}
      <section className="mb-14 max-w-3xl">
        <h2 className="text-xl mb-2">
          Testemunhos <span className="text-titanium/35 text-base">({testemunhos.length})</span>
        </h2>
        <p className="text-xs text-titanium/35 mb-6 leading-relaxed">
          Aparecem na página inicial, antes do último convite ao contacto.
          Enquanto não houver nenhum publicado, a secção não existe no site.
          Escreve o que o cliente vos disse, com o nome que ele autorizou, e
          pede-lhe essa autorização antes de publicar.
        </p>

        <ul className="space-y-3 mb-6">
          {testemunhos.map((t, i) => (
            <li
              key={t.id}
              className={`border border-white/10 rounded-2xl p-5 ${t.published ? '' : 'opacity-50'}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 pt-1">
                  <button
                    onClick={() => moverTestemunho(i, i - 1)}
                    disabled={i === 0}
                    aria-label="Mover para cima"
                    className="p-1 text-titanium/40 hover:text-titanium disabled:opacity-20"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => moverTestemunho(i, i + 1)}
                    disabled={i === testemunhos.length - 1}
                    aria-label="Mover para baixo"
                    className="p-1 text-titanium/40 hover:text-titanium disabled:opacity-20"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                <div className="flex-1 space-y-3 min-w-0">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input
                      defaultValue={t.author}
                      onBlur={(e) =>
                        e.target.value.trim() !== t.author &&
                        e.target.value.trim() &&
                        guardar(() => siteAdmin.updateTestimonial(t.id, { author: e.target.value.trim() }))
                      }
                      className={`${field} text-sm py-1.5`}
                      placeholder="Ana & Miguel"
                      aria-label="Quem assina"
                    />
                    <input
                      defaultValue={t.context}
                      onBlur={(e) =>
                        e.target.value !== t.context &&
                        guardar(() => siteAdmin.updateTestimonial(t.id, { context: e.target.value }))
                      }
                      className={`${field} text-sm py-1.5`}
                      placeholder="Casamento na Quinta X, setembro 2026"
                      aria-label="Contexto"
                    />
                  </div>
                  <textarea
                    defaultValue={t.quote}
                    rows={3}
                    onBlur={(e) =>
                      e.target.value.trim() !== t.quote &&
                      e.target.value.trim() &&
                      guardar(() => siteAdmin.updateTestimonial(t.id, { quote: e.target.value.trim() }))
                    }
                    className={`${field} text-sm py-1.5 resize-none`}
                    placeholder="O que o cliente escreveu."
                    aria-label="Testemunho"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <button
                    onClick={() =>
                      guardar(() => siteAdmin.updateTestimonial(t.id, { published: !t.published }))
                    }
                    aria-label={t.published ? 'Esconder do site' : 'Mostrar no site'}
                    className="p-2 text-titanium/40 hover:text-titanium transition-colors"
                  >
                    {t.published ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() =>
                      window.confirm(`Apagar o testemunho de ${t.author}?`) &&
                      guardar(() => siteAdmin.deleteTestimonial(t.id), 'Testemunho apagado.')
                    }
                    aria-label="Apagar testemunho"
                    className="p-2 text-titanium/30 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </li>
          ))}
          {testemunhos.length === 0 && (
            <li className="border border-dashed border-white/15 rounded-2xl p-10 text-center text-sm text-titanium/45">
              Ainda sem testemunhos. A secção não aparece no site.
            </li>
          )}
        </ul>

        <button
          onClick={() =>
            guardar(
              () =>
                siteAdmin.createTestimonial({
                  author: 'Novo cliente',
                  context: '',
                  quote: 'Escreve aqui o que o cliente disse.',
                  sortOrder: testemunhos.length,
                  // Nasce escondido: ninguém quer um testemunho por preencher
                  // publicado no site durante o tempo que leva a escrevê-lo.
                  published: false,
                }),
              'Testemunho criado. Fica escondido até o publicares.',
            )
          }
          className="inline-flex items-center gap-2 border border-white/20 px-5 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] text-titanium/75 hover:border-white/40 transition-all min-h-[44px]"
        >
          <Plus size={14} /> Novo testemunho
        </button>
      </section>
    </div>
  )
}
