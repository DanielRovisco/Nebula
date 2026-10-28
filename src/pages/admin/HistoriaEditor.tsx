import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, ChevronLeft, ChevronRight, Image as ImagemIcone, Trash2, Type, Upload,
} from 'lucide-react'
import { siteAdmin, uploadSitePhoto } from '../../lib/site-content/api'
import { publicUrl } from '../../lib/site-content/public'
import type { BlocoHistoria, Historia, LarguraBloco } from '../../lib/site-content/types'
import { slugify } from '../../lib/gallery/helpers'
import { SITE_URL } from '../../lib/site'

/** O que cada largura quer dizer, por palavras, para não ser preciso explicar. */
const LARGURAS: { valor: LarguraBloco; nome: string }[] = [
  { valor: 'cheia', nome: 'Cheia' },
  { valor: 'grande', nome: 'Grande' },
  { valor: 'par', nome: 'Lado a lado' },
]

export default function HistoriaEditor() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [historia, setHistoria] = useState<Historia | null>(null)
  const [blocos, setBlocos] = useState<BlocoHistoria[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [recado, setRecado] = useState<string | null>(null)
  const [aGuardar, setAGuardar] = useState(false)
  const [upload, setUpload] = useState<{ feitos: number; total: number } | null>(null)
  const ficheiros = useRef<HTMLInputElement>(null)
  const capaInput = useRef<HTMLInputElement>(null)

  const carregar = useCallback(() => {
    siteAdmin
      .lerHistoria(id)
      .then((d) => {
        if (!d) {
          navigate('/admin/historias')
          return
        }
        setHistoria(d.historia)
        setBlocos(d.blocos)
      })
      .catch((e) => setErro((e as Error).message))
  }, [id, navigate])

  useEffect(carregar, [carregar])

  function aviso(m: string) {
    setRecado(m)
    setTimeout(() => setRecado(null), 2500)
  }

  /**
   * Guarda um campo da história.
   *
   * Sem botão de guardar: cada campo guarda-se ao sair dele. Escrever uma
   * história é um trabalho de ir e vir, e um botão por carregar no fim é
   * trabalho perdido quando o separador fecha.
   */
  const guardar = async (patch: Partial<Historia>) => {
    if (!historia) return
    setHistoria({ ...historia, ...patch })
    setErro(null)
    try {
      await siteAdmin.guardarHistoria(historia.id, patch)
    } catch (e) {
      setErro((e as Error).message)
      carregar()
    }
  }

  async function juntarFotografias(lista: FileList | null) {
    if (!lista?.length || !historia) return
    const fotos = Array.from(lista).filter((f) => f.type.startsWith('image/'))
    if (!fotos.length) return
    setErro(null)
    setUpload({ feitos: 0, total: fotos.length })
    let ordem = blocos.length
    try {
      for (const f of fotos) {
        const up = await uploadSitePhoto(f)
        await siteAdmin.addBloco({
          storyId: historia.id,
          kind: 'foto',
          storageKey: up.storageKey,
          mediumKey: up.mediumKey,
          thumbKey: up.thumbKey,
          width: up.width,
          height: up.height,
          contentType: up.contentType,
          pos: '50% 50%',
          alt: f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          texto: null,
          largura: 'grande',
          sortOrder: ordem++,
        })
        setUpload((u) => (u ? { ...u, feitos: u.feitos + 1 } : null))
      }
      carregar()
      aviso(`${fotos.length} ${fotos.length === 1 ? 'fotografia junta' : 'fotografias juntas'}.`)
    } catch (e) {
      setErro((e as Error).message)
      carregar()
    } finally {
      setUpload(null)
      if (ficheiros.current) ficheiros.current.value = ''
    }
  }

  async function juntarTexto() {
    if (!historia) return
    try {
      await siteAdmin.addBloco({
        storyId: historia.id,
        kind: 'texto',
        storageKey: null, mediumKey: null, thumbKey: null,
        width: null, height: null, contentType: null,
        pos: '50% 50%', alt: '', texto: '',
        largura: 'grande',
        sortOrder: blocos.length,
      })
      carregar()
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  async function trocarCapa(lista: FileList | null) {
    const f = lista?.[0]
    if (!f || !historia) return
    setAGuardar(true)
    setErro(null)
    try {
      const up = await uploadSitePhoto(f)
      await guardar({
        coverKey: up.storageKey,
        coverMediumKey: up.mediumKey,
        coverWidth: up.width,
        coverHeight: up.height,
      })
      aviso('Capa trocada.')
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setAGuardar(false)
      if (capaInput.current) capaInput.current.value = ''
    }
  }

  /** Mover um bloco. A ordem no painel é a ordem com que a história se lê. */
  async function mover(i: number, para: number) {
    if (para < 0 || para >= blocos.length) return
    const nova = [...blocos]
    const [b] = nova.splice(i, 1)
    nova.splice(para, 0, b)
    setBlocos(nova)
    try {
      await siteAdmin.ordenarBlocos(nova.map((x) => x.id))
    } catch (e) {
      setErro((e as Error).message)
      carregar()
    }
  }

  async function mudarBloco(bloco: BlocoHistoria, patch: Partial<BlocoHistoria>) {
    setBlocos((bs) => bs.map((b) => (b.id === bloco.id ? { ...b, ...patch } : b)))
    try {
      await siteAdmin.guardarBloco(bloco.id, patch)
    } catch (e) {
      setErro((e as Error).message)
      carregar()
    }
  }

  async function apagarBloco(bloco: BlocoHistoria) {
    if (!window.confirm('Tirar este bloco da história?')) return
    setBlocos((bs) => bs.filter((b) => b.id !== bloco.id))
    try {
      await siteAdmin.apagarBloco(bloco.id)
    } catch (e) {
      setErro((e as Error).message)
      carregar()
    }
  }

  async function apagarHistoria() {
    if (!historia) return
    if (!window.confirm(`Apagar a história "${historia.title}"? Não há como recuperar.`)) return
    try {
      await siteAdmin.apagarHistoria(historia.id)
      navigate('/admin/historias')
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  if (!historia) return <div className="container-px min-h-[40vh]" />

  const campo =
    'w-full bg-transparent border-b border-white/15 py-2.5 outline-none focus:border-titanium/60 transition-colors placeholder:text-titanium/25'
  const endereco = `${SITE_URL}/historias/${historia.slug}`

  return (
    <div className="container-px">
      <Link
        to="/admin/historias"
        className="inline-flex items-center gap-2 label-sm text-titanium/40 hover:text-titanium/70 transition-colors mb-8"
      >
        <ArrowLeft size={13} /> Histórias
      </Link>

      <div className="flex items-end justify-between flex-wrap gap-4 mb-3">
        <h1 className="text-3xl sm:text-4xl">{historia.title}</h1>
        <div className="flex items-center gap-2">
          {historia.published && (
            <a
              href={endereco}
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] border border-white/20 text-titanium/70 hover:border-white/40 transition-all min-h-[44px] inline-flex items-center"
            >
              Ver no site
            </a>
          )}
          <button
            onClick={() => guardar({ published: !historia.published })}
            className={`px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] font-semibold transition-all min-h-[44px] active:scale-95 ${
              historia.published
                ? 'border border-white/20 text-titanium/70 hover:border-white/40'
                : 'bg-titanium text-eerie'
            }`}
          >
            {historia.published ? 'Despublicar' : 'Publicar'}
          </button>
        </div>
      </div>
      <p className="text-xs text-titanium/30 break-all mb-10">{endereco}</p>

      {erro && <p className="text-[13px] text-amber-300/80 mb-6">{erro}</p>}
      {recado && <p className="text-[13px] text-titanium/50 mb-6">{recado}</p>}

      {/* ── A capa e a ficha ───────────────────────────────── */}
      <section className="grid lg:grid-cols-2 gap-10 mb-16">
        <div>
          <h2 className="text-xl mb-2">Capa</h2>
          <p className="text-xs text-titanium/35 mb-5 leading-relaxed">
            É o primeiro ecrã de quem abre a história, e é ela que aparece na
            lista. Escolhe a fotografia que faz parar.
          </p>
          <div className="aspect-[3/2] rounded-xl overflow-hidden bg-white/[0.04] mb-3">
            {historia.coverKey && (
              <img
                src={publicUrl(historia.coverMediumKey ?? historia.coverKey)}
                alt=""
                style={{ objectPosition: historia.coverPos }}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => capaInput.current?.click()}
              disabled={aGuardar}
              className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-titanium/45 hover:text-titanium/80 transition-colors px-3 py-2 disabled:opacity-40"
            >
              <Upload size={13} /> {aGuardar ? 'A carregar…' : 'Trocar capa'}
            </button>
            <input
              ref={capaInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => trocarCapa(e.target.files)}
            />
            {historia.coverKey && (
              <label className="flex items-center gap-2 text-xs text-titanium/40">
                Recorte
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Number(historia.coverPos.split(' ')[1]?.replace('%', '') ?? 50)}
                  onChange={(e) => setHistoria({ ...historia, coverPos: `50% ${e.target.value}%` })}
                  onPointerUp={() => guardar({ coverPos: historia.coverPos })}
                  className="w-32 accent-[#fcfff0]"
                />
              </label>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="label-sm block mb-2" htmlFor="h-titulo">Título</label>
            <input
              id="h-titulo"
              className={campo}
              defaultValue={historia.title}
              onBlur={(e) => guardar({ title: e.target.value.trim() || historia.title })}
            />
          </div>
          <div>
            <label className="label-sm block mb-2" htmlFor="h-slug">Endereço</label>
            <input
              id="h-slug"
              className={campo}
              defaultValue={historia.slug}
              onBlur={(e) => guardar({ slug: slugify(e.target.value) || historia.slug })}
            />
          </div>
          <div>
            <label className="label-sm block mb-2" htmlFor="h-sub">Sítio e altura</label>
            <input
              id="h-sub"
              className={campo}
              placeholder="Quinta do Pisão, Setembro de 2026"
              defaultValue={historia.subtitle ?? ''}
              onBlur={(e) => guardar({ subtitle: e.target.value })}
            />
          </div>
          <div>
            <label className="label-sm block mb-2" htmlFor="h-data">Data</label>
            <input
              id="h-data"
              type="date"
              className={campo}
              defaultValue={historia.eventDate ?? ''}
              onBlur={(e) => guardar({ eventDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label-sm block mb-2" htmlFor="h-intro">Abertura</label>
            <textarea
              id="h-intro"
              rows={4}
              className={`${campo} resize-y`}
              placeholder="Duas ou três linhas sobre o dia, escritas por ti."
              defaultValue={historia.intro ?? ''}
              onBlur={(e) => guardar({ intro: e.target.value })}
            />
          </div>
        </div>
      </section>

      {/* ── A história ─────────────────────────────────────── */}
      <section className="mb-16">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-xl">A história</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={juntarTexto}
              className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-titanium/45 hover:text-titanium/80 transition-colors px-3 py-2"
            >
              <Type size={13} /> Juntar texto
            </button>
            <button
              onClick={() => ficheiros.current?.click()}
              disabled={Boolean(upload)}
              className="inline-flex items-center gap-2.5 bg-titanium text-eerie px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] font-semibold active:scale-95 transition-all min-h-[44px] disabled:opacity-60"
            >
              <ImagemIcone size={14} />
              {upload ? `A carregar ${upload.feitos}/${upload.total}` : 'Juntar fotografias'}
            </button>
            <input
              ref={ficheiros}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => juntarFotografias(e.target.files)}
            />
          </div>
        </div>

        {blocos.length === 0 ? (
          <p className="text-sm text-titanium/45">
            Junta as fotografias pela ordem em que queres contar o dia, e mete
            texto onde a história precisar de respirar.
          </p>
        ) : (
          <ol className="space-y-3">
            {blocos.map((b, i) => (
              <li
                key={b.id}
                className="flex gap-4 items-start border border-white/[0.08] rounded-xl p-3"
              >
                <div className="flex flex-col gap-1 pt-1">
                  <button
                    onClick={() => mover(i, i - 1)}
                    disabled={i === 0}
                    aria-label="Subir"
                    className="p-1.5 rounded-full bg-eerie/70 text-titanium/70 hover:text-titanium disabled:opacity-20 rotate-90"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => mover(i, i + 1)}
                    disabled={i === blocos.length - 1}
                    aria-label="Descer"
                    className="p-1.5 rounded-full bg-eerie/70 text-titanium/70 hover:text-titanium disabled:opacity-20 rotate-90"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

                {b.kind === 'foto' ? (
                  <>
                    <div className="w-28 shrink-0 aspect-[4/3] rounded-lg overflow-hidden bg-white/[0.04]">
                      <img
                        src={publicUrl(b.thumbKey ?? b.storageKey ?? '')}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {LARGURAS.map((l) => (
                          <button
                            key={l.valor}
                            onClick={() => mudarBloco(b, { largura: l.valor })}
                            className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.15em] border transition-colors ${
                              b.largura === l.valor
                                ? 'border-titanium/60 text-titanium'
                                : 'border-white/10 text-titanium/40 hover:border-white/30'
                            }`}
                          >
                            {l.nome}
                          </button>
                        ))}
                      </div>
                      <input
                        className={`${campo} text-xs`}
                        placeholder="O que se vê, em palavras. Serve a quem não vê e serve o Google."
                        defaultValue={b.alt}
                        onBlur={(e) => mudarBloco(b, { alt: e.target.value })}
                      />
                    </div>
                  </>
                ) : (
                  <textarea
                    rows={3}
                    className={`${campo} flex-1 resize-y`}
                    placeholder="O texto que vai aqui."
                    defaultValue={b.texto ?? ''}
                    onBlur={(e) => mudarBloco(b, { texto: e.target.value })}
                  />
                )}

                <button
                  onClick={() => apagarBloco(b)}
                  aria-label="Tirar da história"
                  className="p-2 text-titanium/40 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ── A frase deles ──────────────────────────────────── */}
      <section className="mb-16 max-w-2xl">
        <h2 className="text-xl mb-2">A frase deles</h2>
        <p className="text-xs text-titanium/35 mb-5 leading-relaxed">
          Aparece a fechar a história. Em branco, o bloco não existe: vale mais
          não haver frase nenhuma do que uma escrita por nós.
        </p>
        <textarea
          rows={3}
          className={`${campo} resize-y mb-4`}
          placeholder="O que eles escreveram."
          defaultValue={historia.quote ?? ''}
          onBlur={(e) => guardar({ quote: e.target.value })}
        />
        <input
          className={campo}
          placeholder="Quem assina"
          defaultValue={historia.quoteAuthor ?? ''}
          onBlur={(e) => guardar({ quoteAuthor: e.target.value })}
        />
      </section>

      <section className="mb-20">
        <button
          onClick={apagarHistoria}
          className="text-[11px] uppercase tracking-[0.18em] text-red-300/70 hover:text-red-300 transition-colors px-3 py-2"
        >
          Apagar história
        </button>
      </section>
    </div>
  )
}
