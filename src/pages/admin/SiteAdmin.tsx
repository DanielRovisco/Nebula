import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Eye, EyeOff, Maximize2, Plus, Trash2, Upload } from 'lucide-react'
import { siteAdmin, publicUrl, uploadSitePhoto, SITE_EDGE } from '../../lib/site-content/api'
import type { SiteCategory, SitePhoto, Testimonial } from '../../lib/site-content/types'
import { DEMO } from '../../lib/gallery/config'
import { slugify } from '../../lib/gallery/helpers'
import { asset } from '../../lib/asset'

const field =
  'w-full bg-transparent border-b border-white/15 py-2.5 outline-none focus:border-titanium/60 transition-colors placeholder:text-titanium/25'

/** Em demonstração as imagens vêm do próprio portfólio do site. */
const thumbUrl = (p: SitePhoto) =>
  DEMO
    ? asset(`/brand/portfolio/${(p.thumbKey ?? '').split('/').pop()}`)
    : publicUrl(p.thumbKey ?? p.storageKey)

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

  useEffect(() => {
    let vivo = true
    Promise.all([siteAdmin.listCategories(), siteAdmin.listPhotos(), siteAdmin.listTestimonials()])
      .then(([c, p, t]) => {
        if (!vivo) return
        setCategories(c)
        setPhotos(p)
        setTestemunhos(t)
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
    const files = Array.from(list).filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
    setError(null)
    setUpload({ done: 0, total: files.length })
    let ordem = photos.length
    try {
      for (const file of files) {
        const up = await uploadSitePhoto(file)
        await siteAdmin.addPhoto({
          ...up,
          thumbKey: up.thumbKey,
          categoryId: categories[0]?.id ?? null,
          // Nome do ficheiro como ponto de partida — é melhor do que vazio, e o
          // texto alternativo é editável logo abaixo de cada foto.
          alt: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          sortOrder: ordem++,
        })
        setUpload((u) => (u ? { ...u, done: u.done + 1 } : null))
      }
      flash(`${files.length} ${files.length === 1 ? 'foto adicionada' : 'fotos adicionadas'}.`)
      recarregar()
    } catch (e) {
      setError((e as Error).message)
      recarregar()
    } finally {
      setUpload(null)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  function mover(from: number, to: number) {
    if (to < 0 || to >= photos.length) return
    const next = [...photos]
    const [m] = next.splice(from, 1)
    next.splice(to, 0, m)
    setPhotos(next)
    siteAdmin.reorderPhotos(next.map((p) => p.id)).catch((e) => setError((e as Error).message))
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
        código — o site nunca fica vazio.
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
          não apaga as fotos — ficam sem categoria à espera de nova.
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
            accept="image/*"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
        <p className="text-xs text-titanium/35 mb-6 leading-relaxed">
          Reduzidas para {SITE_EDGE}px no upload — numa página pública o peso
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
              Sem fotos carregadas — o site mostra as que estão no código.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((p, i) => (
              <div
                key={p.id}
                className={`border border-white/10 rounded-2xl overflow-hidden ${
                  p.published ? '' : 'opacity-50'
                }`}
              >
                <div className="relative aspect-[4/3] bg-white/[0.04]">
                  <img src={thumbUrl(p)} alt={p.alt} loading="lazy" className="w-full h-full object-cover" />
                  <div className="absolute top-1.5 left-1.5 flex gap-1">
                    <button
                      onClick={() => mover(i, i - 1)}
                      disabled={i === 0}
                      aria-label="Mover para trás"
                      className="p-1.5 rounded-full bg-eerie/70 text-titanium/80 hover:text-titanium disabled:opacity-0"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <button
                      onClick={() => mover(i, i + 1)}
                      disabled={i === photos.length - 1}
                      aria-label="Mover para a frente"
                      className="p-1.5 rounded-full bg-eerie/70 text-titanium/80 hover:text-titanium disabled:opacity-0"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                  <div className="absolute top-1.5 right-1.5 flex gap-1">
                    <button
                      onClick={() => guardar(() => siteAdmin.updatePhoto(p.id, { tall: !p.tall }))}
                      title="Ocupar duas linhas na grelha"
                      aria-label="Alternar destaque"
                      className={`p-1.5 rounded-full bg-eerie/70 transition-colors ${
                        p.tall ? 'text-amber-300' : 'text-titanium/60 hover:text-titanium'
                      }`}
                    >
                      <Maximize2 size={13} />
                    </button>
                    <button
                      onClick={() => guardar(() => siteAdmin.updatePhoto(p.id, { published: !p.published }))}
                      aria-label={p.published ? 'Esconder do site' : 'Mostrar no site'}
                      className="p-1.5 rounded-full bg-eerie/70 text-titanium/60 hover:text-titanium transition-colors"
                    >
                      {p.published ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                    <button
                      onClick={() =>
                        window.confirm('Apagar esta foto do portfólio?') &&
                        guardar(() => siteAdmin.deletePhoto(p.id), 'Foto apagada.')
                      }
                      aria-label="Apagar foto"
                      className="p-1.5 rounded-full bg-eerie/70 text-titanium/60 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <label className="label-sm block mb-1.5">Categoria</label>
                    <select
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
                    <label className="label-sm block mb-1.5">Descrição da imagem</label>
                    <input
                      defaultValue={p.alt}
                      onBlur={(e) =>
                        e.target.value !== p.alt &&
                        guardar(() => siteAdmin.updatePhoto(p.id, { alt: e.target.value }))
                      }
                      className={`${field} text-sm py-1.5`}
                      placeholder="Noiva entre árvores"
                    />
                    <p className="text-[10px] text-titanium/25 mt-1.5">
                      Lida por quem não vê a imagem, e pelo Google.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Testemunhos ─────────────────────────────────────── */}
      <section className="mb-14 max-w-3xl">
        <h2 className="text-xl mb-2">
          Testemunhos <span className="text-titanium/35 text-base">({testemunhos.length})</span>
        </h2>
        <p className="text-xs text-titanium/35 mb-6 leading-relaxed">
          Aparecem na página inicial, antes do último convite ao contacto.
          Enquanto não houver nenhum publicado, a secção não existe no site.
          Escreve o que o cliente vos disse, com o nome que ele autorizou — e
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
              Ainda sem testemunhos — a secção não aparece no site.
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
              'Testemunho criado — está escondido até o publicares.',
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
