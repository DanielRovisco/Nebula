import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Check, CheckSquare, ChevronLeft, ChevronRight, Clock, Copy, Film, Play, Star, Trash2,
  Upload,
} from 'lucide-react'
import { useArrastar } from './useArrastar'
import { api } from '../../lib/gallery/api'
import type { Gallery, Photo } from '../../lib/gallery/types'
import { SITE_URL } from '../../lib/site'
import { saveSession } from '../../lib/gallery/session'
import { nomeLivre, suggestPassword } from '../../lib/gallery/helpers'
import { DELIVERY_EDGE } from '../../lib/gallery/api'
import { COVER_FONTS, LOGO_VARIANTS } from '../../lib/gallery/cover'
import { isVideo, type CoverFont, type LogoVariant } from '../../lib/gallery/types'
import { slugify } from '../../lib/gallery/helpers'
import { guardarPassword, lerPassword, mensagemDePartilha } from '../../lib/gallery/partilha'
import { nomeDaCopiaLeve } from '../../lib/gallery/download'
import ProvaDeVideo from './ProvaDeVideo'
import GalleryActivity from './GalleryActivity'
import GalleryFavorites from './GalleryFavorites'

export default function GalleryEditor() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [copiado, setCopiado] = useState<string | null>(null)
  const [pedirPassword, setPedirPassword] = useState(false)
  const [passwordParaCopiar, setPasswordParaCopiar] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [upload, setUpload] = useState<{ done: number; total: number } | null>(null)
  const [conversao, setConversao] = useState<{ nome: string; percentagem: number } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [preparando, setPreparando] = useState(false)
  // Ligado por omissão: uma galeria de entrega não precisa da resolução da
  // máquina, e reduzir é o que faz o armazenamento gratuito chegar.
  const [shrink, setShrink] = useState(true)
  const fileInput = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    api
      .getGallery(id)
      .then(({ gallery, photos }) => {
        setGallery(gallery)
        setPhotos(photos)
      })
      .catch((e) => setError((e as Error).message))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  /*
    Endereços assinados para as miniaturas da grelha.

    O bucket das galerias é privado de propósito: o que lá está são
    fotografias de clientes, e o caminho do ficheiro não é password nenhuma.
    A grelha usava o caminho directamente como `src`, o que dava uma imagem
    partida em cada quadrado — e só aqui, porque a galeria do cliente já pedia
    endereços assinados.

    Vai num efeito à parte para a página abrir de imediato: os nomes, a ordem
    e os botões não têm de esperar por assinaturas. Os endereços duram duas
    horas (READ_TTL na função admin-storage), o que cobre uma sessão de
    edição inteira sem os voltar a pedir.
  */
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  /** Vídeos sem fotograma, e o andamento de os fazer. */
  const [miniaturas, setMiniaturas] = useState<
    { feitas: number; total: number; aConverter?: number } | null
  >(null)
  const [recado, setRecado] = useState<string | null>(null)
  /** O vídeo que está a ser posto à prova, quando há um. */
  const [prova, setProva] = useState<Photo | null>(null)
  /**
   * As fotografias escolhidas, ou nulo quando não se está a escolher.
   *
   * Nulo e não um conjunto vazio: é o que separa "não estou a escolher" de
   * "estou a escolher e ainda não escolhi nada". Sem essa diferença, a grelha
   * não sabia se um toque numa fotografia era para a escolher ou para abrir o
   * vídeo.
   */
  const [escolhidas, setEscolhidas] = useState<Set<string> | null>(null)
  /**
   * Ficheiros à espera de resposta por terem nome repetido.
   *
   * Guarda-se a lista inteira do que se tentou carregar, e não só os repetidos:
   * a resposta aplica-se a todos de uma vez, e os que não chocam com nada têm
   * de subir na mesma.
   */
  const [repetidos, setRepetidos] = useState<
    { ficheiros: File[]; nomes: string[]; ids: string[] } | null
  >(null)
  const [aApagar, setAApagar] = useState(false)
  useEffect(() => {
    if (!photos.length) return
    let vivo = true
    /*
      Pede-se a miniatura quando ela existe, e o original só para as
      fotografias. Pedir o original de um vídeo era assiná-lo para o pôr dentro
      de uma `<img>`, e isso descarrega o vídeo inteiro para não mostrar nada.
    */
    const comImagem = photos.filter((f) => f.thumbPath || !isVideo(f))
    const chaves = comImagem.map((f) => f.thumbPath ?? f.storagePath)
    api
      .readUrls(chaves)
      .then((urls) => {
        if (!vivo) return
        setThumbs(Object.fromEntries(comImagem.map((f, i) => [f.id, urls[i]])))
      })
      .catch(() => {
        /* sem miniaturas a grelha fica sem imagens, mas o resto funciona */
      })
    return () => {
      vivo = false
    }
  }, [photos])

  function flash(msg: string) {
    setNotice(msg)
    setTimeout(() => setNotice(null), 2500)
  }

  async function patch(changes: Parameters<typeof api.updateGallery>[1]) {
    if (!gallery) return
    setSaving(true)
    setError(null)
    try {
      const updated = await api.updateGallery(gallery.id, changes)
      setGallery(updated)
      flash('Guardado.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleFiles(list: FileList | null) {
    if (!list?.length || !gallery) return
    const files = Array.from(list).filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/'),
    )
    if (!files.length) return

    /*
      Nomes repetidos: pergunta-se antes de carregar seja o que for.
      
      Sem isto ficavam duas fotografias diferentes com o mesmo nome na galeria,
      e quem as descarregasse recebia uma pergunta do próprio sistema a
      perguntar qual delas fica — uma pergunta que é nossa e não do cliente. A
      comparação é em minúsculas, como no Windows e no macOS.
    */
    const porNome = new Map(photos.map((p) => [p.fileName.toLowerCase(), p.id]))
    const chocam = files.filter((f) => porNome.has(f.name.toLowerCase()))
    if (chocam.length) {
      setRepetidos({
        ficheiros: files,
        nomes: chocam.map((f) => f.name),
        ids: chocam.map((f) => porNome.get(f.name.toLowerCase())!),
      })
      // Limpa já o input: sem isto, escolher os mesmos ficheiros a seguir não
      // dispara nada, porque o valor não mudou.
      if (fileInput.current) fileInput.current.value = ''
      return
    }

    await enviar(files)
  }

  /**
   * Carrega os ficheiros e, quando é uma substituição, apaga os antigos.
   *
   * Pela ordem certa: primeiro sobe o novo, só depois se apaga o velho. Ao
   * contrário, um upload que falhasse a meio deixava a galeria sem a
   * fotografia antiga e sem a nova.
   */
  async function enviar(files: File[], aSubstituir: string[] = []) {
    if (!gallery) return
    setError(null)
    setUpload({ done: 0, total: files.length })
    try {
      await api.uploadPhotos(
        gallery.id,
        files,
        (done) => setUpload({ done, total: files.length }),
        {
          maxEdge: shrink ? DELIVERY_EDGE : null,
          /*
            A conversão de um vídeo demora o tempo do próprio vídeo. Sem este
            andamento, quem carrega um de cinco minutos fica cinco minutos a
            olhar para uma barra parada e conclui, com razão, que bloqueou.
          */
          aoConverter: (nome, f) => setConversao({ nome, percentagem: Math.round(f * 100) }),
        },
      )
      setConversao(null)
      if (aSubstituir.length) await api.apagarFotos(aSubstituir)
      load()
      flash(
        `${files.length} ${files.length === 1 ? 'foto adicionada' : 'fotos adicionadas'}.`
        + (aSubstituir.length
          ? ` ${aSubstituir.length} ${aSubstituir.length === 1 ? 'substituída' : 'substituídas'}.`
          : ''),
      )
    } catch (e) {
      setError((e as Error).message)
      load()
    } finally {
      setUpload(null)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function removePhoto(photo: Photo) {
    if (!window.confirm(`Apagar ${photo.fileName}? Não há como recuperar.`)) return
    // Optimista: a grelha responde já, e um erro repõe o estado real.
    setPhotos((p) => p.filter((x) => x.id !== photo.id))
    try {
      await api.deletePhoto(photo.id)
    } catch (e) {
      setError((e as Error).message)
      load()
    }
  }

  const aEscolher = escolhidas !== null

  function alternar(id: string) {
    setEscolhidas((antes) => {
      const novo = new Set(antes ?? [])
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  async function apagarEscolhidas() {
    if (!escolhidas?.size) return
    const quantas = escolhidas.size
    if (!window.confirm(
      `Apagar ${quantas} ${quantas === 1 ? 'ficheiro' : 'ficheiros'}? Não há como recuperar.`,
    )) return

    const ids = [...escolhidas]
    setAApagar(true)
    setError(null)
    // Optimista: a grelha responde já, e um erro repõe o estado real.
    setPhotos((p) => p.filter((x) => !escolhidas.has(x.id)))
    setEscolhidas(null)
    try {
      await api.apagarFotos(ids)
      /*
        Recarrega-se mesmo tendo corrido bem: entre as fotografias apagadas pode
        ir a capa, e aí é a galeria que muda e não só a grelha. Sem isto, o
        painel continuava a mostrar como capa uma fotografia que já não existe.
      */
      await load()
      flash(`${quantas} ${quantas === 1 ? 'apagado' : 'apagados'}.`)
    } catch (e) {
      setError((e as Error).message)
      load()
    } finally {
      setAApagar(false)
    }
  }

  function substituirRepetidos() {
    if (!repetidos) return
    const { ficheiros, ids } = repetidos
    setRepetidos(null)
    void enviar(ficheiros, ids)
  }

  function renomearRepetidos() {
    if (!repetidos) return
    /*
      O conjunto vai crescendo à medida que se renomeia. Sem isso, dois
      ficheiros repetidos na mesma leva recebiam os dois a letra "a" e ficavam
      outra vez com o mesmo nome um do outro.
    */
    const ocupados = new Set(photos.map((p) => p.fileName.toLowerCase()))
    const renomeados = repetidos.ficheiros.map((f) => {
      const novo = nomeLivre(f.name, ocupados)
      ocupados.add(novo.toLowerCase())
      return novo === f.name
        ? f
        : new File([f], novo, { type: f.type, lastModified: f.lastModified })
    })
    setRepetidos(null)
    void enviar(renomeados)
  }

  async function removeGallery() {
    if (!gallery) return
    if (
      !window.confirm(
        `Apagar a galeria "${gallery.title}" e as suas ${photos.length} fotos? Não há como recuperar.`,
      )
    )
      return
    try {
      await api.deleteGallery(gallery.id)
      navigate('/admin')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= photos.length) return
    const next = [...photos]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setPhotos(next)
    api.reorderPhotos(id, next.map((p) => p.id)).catch((e) => setError((e as Error).message))
  }

  const { aArrastar, propsDe } = useArrastar(move)

  /**
   * Põe a galeria pela ordem em que o dia aconteceu, usando a hora lida do
   * EXIF de cada fotografia. Com duas máquinas no mesmo casamento, os nomes de
   * ficheiro não têm relação nenhuma entre si e a ordem por nome conta o dia
   * aos saltos.
   */
  /*
    Vídeos por tratar: sem imagem na grelha, ou sem a cópia leve que é a que
    corre num telemóvel. O mesmo botão faz as duas coisas, porque abrir o vídeo
    é o passo caro e vale a pena aproveitá-lo.
  */
  const semMiniatura = photos.filter((p) => isVideo(p) && (!p.thumbPath || !p.previewPath))

  /*
    O que um vídeo pede à rede, em megabits por segundo.

    É o número que decide se ele corre num telemóvel. Medido com um ficheiro de
    dezassete megabits: numa ligação sem limite e a vinte e cinco corre;
    a dez e a quatro nem arranca. Um telemóvel numa casa ou na rua raramente
    tem mais do que uns poucos megabits para dar a um vídeo.

    Oito é o tecto que se põe aqui. Acima disso avisa-se, porque quem carregou
    o ficheiro é a única pessoa que o pode voltar a exportar mais leve.
  */
  const TECTO_MBPS = 8
  const debito = (p: Photo): number | null =>
    p.sizeBytes && p.durationSeconds ? (p.sizeBytes * 8) / p.durationSeconds / 1_000_000 : null

  /*
    Só se avisa de quem não tem cópia leve. Com ela, o débito do original deixa
    de interessar: o que o cliente vê é a cópia, e o original só desce quando
    alguém o descarrega de propósito.
  */
  const pesados = photos.filter(
    (p) => isVideo(p) && !p.previewPath && (debito(p) ?? 0) > TECTO_MBPS,
  )

  /*
    Cópias leves em VP8 ou VP9.

    O formato que sai depende do browser que converteu. Um iPhone lê WebM a
    partir do iOS 17.4, mas descodifica VP9 por software — e 720p por software
    num telemóvel trava na mesma, por mais leve que o ficheiro esteja. O H.264
    tem descodificador próprio em todos eles.

    Não se pode corrigir daqui: quem decide é o browser que faz a conversão. O
    que se pode é dizê-lo, para quem está a ver saber que vale a pena tentar
    noutro browser em vez de andar a reduzir o débito sem resultado.
  */
  const emVp = photos.filter(
    (p) => p.previewPath && /vp0?8|vp0?9|webm/i.test(p.previewType ?? ''),
  )

  async function fazerMiniaturas() {
    if (!semMiniatura.length) return
    setMiniaturas({ feitas: 0, total: semMiniatura.length })
    setRecado(null)
    let imagens = 0
    let semVideo = 0
    let leves = 0
    const porque = new Map<string, number>()

    // Um de cada vez: cada um traz um vídeo da rede e descodifica um fotograma.
    for (const foto of semMiniatura) {
      const r = await api.gerarMiniaturaDeVideo(foto, (f) =>
        setMiniaturas({ feitas: imagens, total: semMiniatura.length, aConverter: Math.round(f * 100) }))
      if (r.imagem === 'feita') imagens++
      else if (r.imagem === 'sem_video') semVideo++
      if (r.leve === 'feita') leves++
      else porque.set(r.leve, (porque.get(r.leve) ?? 0) + 1)
      setMiniaturas({ feitas: imagens, total: semMiniatura.length })
    }

    /*
      O recado diz as duas coisas em separado.

      Antes falava só das imagens, e dizia que tinha corrido bem mesmo quando
      nenhuma cópia leve tinha sido feita — que é precisamente a parte que faz o
      vídeo correr num telemóvel. Quem carregasse ficava convencido de que
      estava tratado, e não estava.
    */
    const RAZOES: Record<string, string> = {
      nao_trouxe: 'não consegui trazer o original, e quase sempre isso é o CORS do bucket: '
        + 'Cloudflare → R2 → bucket das galerias → Settings → CORS policy, com a origem '
        + 'deste site em AllowedOrigins e GET em AllowedMethods',
      browser_nao_sabe: 'este browser não sabe converter vídeo — experimenta no Chrome ou no Safari',
      nao_converteu: 'a conversão não deu nada de útil',
      nao_precisa: 'já eram leves e não precisavam',
      sem_imagem: 'nem cheguei a tentar, porque não consegui abrir o vídeo',
      falhou: 'falhou a meio',
    }
    const partes: string[] = []
    if (!imagens && semVideo === semMiniatura.length) {
      partes.push(
        'Não consegui abrir nenhum dos vídeos. Quase sempre é o CORS do bucket: '
        + 'Cloudflare → R2 → bucket das galerias → Settings → CORS policy, '
        + 'com a origem deste site em AllowedOrigins e GET em AllowedMethods.',
      )
    } else if (imagens < semMiniatura.length) {
      partes.push(`Imagens: fiz ${imagens} de ${semMiniatura.length}.`)
    }
    const semLeve = [...porque.entries()].filter(([k]) => k !== 'nao_precisa')
    if (semLeve.length) {
      const maior = semLeve.sort((a, b) => b[1] - a[1])[0]
      const razao = RAZOES[maior[0]] ? ` — ${RAZOES[maior[0]]}` : ''
      partes.push(
        leves
          ? `Cópias leves: fiz ${leves} de ${semMiniatura.length}${razao}.`
          : `Não fiz nenhuma cópia leve${razao}. Sem ela o vídeo continua com travagens no telemóvel.`,
      )
    }
    setRecado(partes.length ? partes.join(' ') : null)
    load()
    setMiniaturas(null)
  }

  /**
   * Ordena pela hora a que foram tiradas e renomeia tudo para Nebula1, Nebula2.
   *
   * Devolve o que aconteceu em vez de o mostrar: quem chama isto a publicar
   * precisa de juntar o recado ao seu, e quem chama pelo botão só quer a frase.
   */
  async function arrumar(): Promise<string | null> {
    if (!gallery) return null
    try {
      const quantas = await api.arrumarGaleria(gallery.id)
      if (!quantas) return null
      return `${quantas} ${quantas === 1 ? 'ficheiro arrumado' : 'ficheiros arrumados'} por data, de Nebula1 a Nebula${quantas}.`
    } catch (e) {
      /*
        Arrumar não é a razão de ninguém ter carregado no botão: quem publica
        quer publicar. Uma falha aqui fica dita e não trava o resto, senão uma
        galeria pronta ficava por entregar por causa dos nomes dos ficheiros.
      */
      setError(`Não consegui ordenar e renomear: ${(e as Error).message}`)
      return null
    }
  }

  async function arrumarPeloBotao() {
    if (!gallery) return
    setSaving(true)
    setError(null)
    const recado = await arrumar()
    await load()
    if (recado) flash(recado)
    setSaving(false)
  }

  /**
   * Publicar arruma primeiro.
   *
   * Publicar é o momento em que a galeria deixa de ser nossa e passa a ser do
   * cliente, e é esse o momento certo para ela ficar apresentável: por ordem do
   * dia e com nomes nossos. A seguir já é tarde — o cliente pode estar a
   * descarregar enquanto se mexe nos nomes.
   */
  async function publicar() {
    if (!gallery) return
    setSaving(true)
    setError(null)
    const recado = await arrumar()
    try {
      const updated = await api.updateGallery(gallery.id, { published: true })
      setGallery(updated)
      await load()
      flash(recado ? `Publicada. ${recado}` : 'Publicada.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  /**
   * Abre a galeria exatamente como o cliente a vê, sem ter de saber a password
   * dele nem de a mudar para espreitar.
   *
   * Monta a mesma sessão que o acesso normal criaria — com URLs assinados
   * pedidos à Edge Function, que é quem tem as credenciais do R2 — e entrega-a
   * ao separador que abre a seguir. Como não há comprovativo de acesso, nada do
   * que se faça na pré-visualização entra no registo nem nas escolhas do
   * cliente: o que estamos a ver é a entrega dele, não a nossa visita.
   */
  async function preVisualizar() {
    if (!gallery) return
    setPreparando(true)
    setError(null)
    try {
      /*
        A cópia leve tem de vir aqui, e isto já esteve em falta.

        Faltava, e a pré-visualização entregava o original a si própria: o vídeo
        que o cliente vê leve, de vinte megabytes, aparecia aqui como o ficheiro
        da câmara de meio gigabyte. Travava, e travava só aqui, o que mandou
        procurar o defeito no telemóvel, no formato e no débito durante bem mais
        tempo do que devia. Uma pré-visualização que não é fiel é pior do que não
        existir, porque mente com ar de prova.
      */
      const caminhos = photos.flatMap(
        (f) => [f.storagePath, f.thumbPath, f.previewPath].filter(Boolean) as string[],
      )
      // E os mesmos ficheiros outra vez, assinados como anexo, para o download
      // da pré-visualização guardar em vez de abrir.
      const anexos = photos.flatMap((f) => [
        { chave: f.storagePath, nome: f.fileName },
        ...(f.previewPath
          ? [{ chave: f.previewPath, nome: nomeDaCopiaLeve(f.fileName, f.previewType) }]
          : []),
      ])

      const [urls, urlsAnexo] = await Promise.all([
        api.readUrls(caminhos),
        api.readUrls(anexos.map((a) => a.chave), anexos.map((a) => a.nome)),
      ])
      const porCaminho = new Map(caminhos.map((c, i) => [c, urls[i]]))
      const porAnexo = new Map(anexos.map((a, i) => [a.chave, urlsAnexo[i]]))

      const assinadas = photos.map((f) => ({
        id: f.id,
        fileName: f.fileName,
        contentType: f.contentType,
        width: f.width,
        height: f.height,
        sizeBytes: f.sizeBytes,
        url: porCaminho.get(f.storagePath) ?? null,
        thumbUrl: f.thumbPath ? porCaminho.get(f.thumbPath) ?? null : null,
        previewUrl: f.previewPath ? porCaminho.get(f.previewPath) ?? null : null,
        previewType: f.previewType,
        previewBytes: f.previewBytes,
        previewDownloadUrl: f.previewPath ? porAnexo.get(f.previewPath) ?? null : null,
        downloadUrl: porAnexo.get(f.storagePath) ?? null,
      }))
      const capa = gallery.coverPhotoId
        ? assinadas.find((f) => f.id === gallery.coverPhotoId)
        : undefined

      saveSession(gallery.slug, {
        gallery: {
          id: gallery.id,
          slug: gallery.slug,
          title: gallery.title,
          clientName: gallery.clientName,
          message: gallery.message,
          downloadEnabled: gallery.downloadEnabled,
          coverTitle: gallery.coverTitle,
          coverFont: gallery.coverFont,
          logoVariant: gallery.logoVariant,
            // A capa também pela cópia leve: uma capa em vídeo toca em ciclo, e
          // em ciclo o original não arranca num telemóvel.
          coverUrl: capa?.previewUrl ?? capa?.url ?? assinadas[0]?.previewUrl
            ?? assinadas[0]?.url ?? null,
          expiresAt: gallery.expiresAt,
          coverIsVideo: Boolean((capa ?? assinadas[0])?.contentType?.startsWith('video/')),
        },
        photos: assinadas,
        favorites: [],
        expiresIn: 7200,
        // Sem logToken: sem ele não se marca nem se regista nada.
      })

      // A introdução aparece uma vez por sessão; numa pré-visualização queremos
      // vê-la sempre, que é justamente o que estamos a ir conferir.
      try {
        sessionStorage.removeItem(`nebula-intro-${gallery.slug}`)
      } catch { /* sem sessionStorage a introdução aparece na mesma */ }

      window.open(`${import.meta.env.BASE_URL}galeria/${gallery.slug}/ver`.replace('//', '/'), '_blank')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPreparando(false)
    }
  }

  if (!gallery) {
    return (
      <div className="container-px">
        {error ? (
          <p role="alert" className="text-sm text-titanium/75 border border-white/15 rounded-xl p-4">
            {error}
          </p>
        ) : (
          <p className="text-sm text-titanium/40">A carregar…</p>
        )}
      </div>
    )
  }

  const field =
    'w-full bg-transparent border-b border-white/15 py-2.5 outline-none focus:border-titanium/60 transition-colors placeholder:text-titanium/25'
  const link = `${SITE_URL}/galeria/${gallery.slug}`

  async function copiar(password: string) {
    try {
      await navigator.clipboard.writeText(mensagemDePartilha(gallery!.title, link, password))
      guardarPassword(gallery!.id, password)
      setPedirPassword(false)

      /*
        Copiar a mensagem para o cliente publica a galeria, se ainda não
        estiver publicada.

        Copiar o link é o gesto de quem já decidiu entregar — ninguém copia uma
        mensagem pronta a enviar para não a enviar. Publicar num segundo botão
        era um passo fácil de esquecer, e esquecê-lo custava caro: o cliente
        recebia o link, batia com o nariz na porta, e a primeira impressão do
        trabalho ficava a ser "não funciona".

        Publica-se depois de a cópia ter corrido bem, e não antes. Se o browser
        recusar o acesso à área de transferência não se chega aqui, e uma
        galeria não fica aberta ao mundo por causa de uma mensagem que nunca
        chegou a ser copiada.
      */
      /*
        Copiar o link é entregar, e entrega-se arrumado: por ordem do dia e com
        os ficheiros numerados. Mesmo com a galeria já publicada, porque podem
        ter entrado fotografias desde a última vez.
      */
      const arrumadas = await arrumar()
      await load()

      if (!gallery!.published) {
        try {
          const atualizada = await api.updateGallery(gallery!.id, { published: true })
          setGallery(atualizada)
          setCopiado(`Copiado e galeria publicada.${arrumadas ? ` ${arrumadas}` : ''}`)
        } catch {
          // A cópia funcionou; só a publicação falhou. Dizer exactamente isso,
          // senão fica-se a pensar que está tudo pronto quando não está.
          setCopiado(null)
          setError('Copiado, mas não consegui publicar a galeria. Publica no botão acima antes de enviares.')
          return
        }
      } else {
        setCopiado(`Copiado.${arrumadas ? ` ${arrumadas}` : ''}`)
      }
      setTimeout(() => setCopiado(null), 6000)
    } catch {
      setError('O browser não deixou copiar. Copia à mão o link e a password.')
    }
  }

  function copiarParaCliente() {
    const guardada = lerPassword(gallery!.id)
    if (guardada) void copiar(guardada)
    else setPedirPassword(true)
  }

  function confirmarCopia() {
    const p = passwordParaCopiar.trim()
    if (p) void copiar(p)
  }

  return (
    <div className="container-px">
      <Link
        to="/admin"
        className="inline-flex items-center gap-2 label-sm hover:text-titanium/70 transition-colors mb-8"
      >
        <ArrowLeft size={13} /> Todas as galerias
      </Link>

      <div className="flex items-end justify-between flex-wrap gap-4 mb-3">
        <h1 className="text-3xl sm:text-4xl">{gallery.title}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={preVisualizar}
            disabled={preparando}
            className="px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] border border-white/20 text-titanium/70 hover:border-white/40 transition-all min-h-[44px] active:scale-95 disabled:opacity-50"
          >
            {preparando ? 'A preparar…' : 'Ver como o cliente'}
          </button>
          <button
            onClick={() => (gallery.published ? patch({ published: false }) : publicar())}
            disabled={saving}
            className={`px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] font-semibold transition-all min-h-[44px] active:scale-95 ${
              gallery.published
                ? 'border border-white/20 text-titanium/70 hover:border-white/40'
                : 'bg-titanium text-eerie'
            }`}
          >
            {gallery.published ? 'Despublicar' : 'Publicar'}
          </button>
        </div>
      </div>
      <p className="text-xs text-titanium/40 break-all mb-2">{link}</p>
      <p className="text-xs text-titanium/30 mb-4">
        {gallery.published
          ? 'Está acessível a quem tiver o link e a password.'
          : 'Em rascunho. Não abre a ninguém, nem com a password certa.'}
      </p>

      {/*
        Copiar link e password de uma vez, prontos a colar na conversa com o
        cliente. Copiá-los à mão são dois gestos e duas oportunidades de
        mandar um sem o outro.

        A password não se lê da base de dados — está cifrada. Vem de onde foi
        escrita: guardada na sessão ao criar a galeria ou ao definir uma nova.
        Sem ela, pergunta-se, em vez de copiar uma mensagem incompleta.
      */}
      <div className="mb-10">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={copiarParaCliente}
            className="inline-flex items-center gap-2 border border-white/15 rounded-full px-5 py-2.5 text-[11px] uppercase tracking-[0.15em] text-titanium/75 hover:text-titanium hover:border-white/35 transition-colors min-h-[40px]"
          >
            <Copy size={13} /> Copiar para o cliente
          </button>
          {copiado && <span className="text-xs text-titanium/60">{copiado}</span>}
        </div>

        {pedirPassword && (
          <div className="mt-3 flex items-end gap-3 flex-wrap border border-white/12 rounded-xl p-4">
            <div className="flex-1 min-w-[200px]">
              <label className="label-sm block mb-2" htmlFor="ge-pass-copiar">
                Password desta galeria
              </label>
              <input
                id="ge-pass-copiar"
                autoFocus
                value={passwordParaCopiar}
                onChange={(e) => setPasswordParaCopiar(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmarCopia()}
                className={field}
                placeholder="a que entregaste ao cliente"
              />
              <p className="text-[10px] text-titanium/40 mt-2">
                Não a conseguimos ler: está guardada cifrada. Se não a tiveres,
                define uma nova mais abaixo e volta aqui.
              </p>
            </div>
            <button
              onClick={confirmarCopia}
              className="bg-titanium text-eerie px-5 py-2.5 rounded-full text-[11px] uppercase tracking-[0.15em] font-semibold active:scale-95 transition-transform min-h-[40px]"
            >
              Copiar
            </button>
          </div>
        )}
      </div>

      {notice && <p className="text-xs text-emerald-300/80 mb-5">{notice}</p>}
      {error && (
        <p role="alert" className="text-sm text-titanium/75 border border-white/15 rounded-xl p-4 mb-6">
          {error}
        </p>
      )}

      {/* ── Fotografias ─────────────────────────────────────── */}
      <section className="mb-14">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
          <h2 className="text-xl">
            Fotografias <span className="text-titanium/35 text-base">({photos.length})</span>
          </h2>
          {/*
            Um vídeo sem fotograma é um quadrado vazio na galeria do cliente.
            Este botão faz-lhe a imagem a partir do ficheiro que já está
            guardado, aqui, sem ninguém ter de o voltar a carregar.
          */}
          {semMiniatura.length > 0 && (
            <button
              onClick={fazerMiniaturas}
              disabled={miniaturas !== null || saving}
              className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-titanium/45 hover:text-titanium/80 transition-colors px-3 py-2 disabled:opacity-40"
            >
              <Film size={13} />
              {miniaturas
                ? miniaturas.aConverter !== undefined
                  ? `A converter… ${miniaturas.feitas + 1} de ${miniaturas.total} · ${miniaturas.aConverter}%`
                  : `A fazer… ${miniaturas.feitas} de ${miniaturas.total}`
                : semMiniatura.length === 1
                  ? 'Preparar o vídeo'
                  : `Preparar os ${semMiniatura.length} vídeos`}
            </button>
          )}
          {/*
            Só faz sentido oferecer se houver datas para ordenar: fotografias
            exportadas sem EXIF e vídeos não trazem nenhuma.
          */}
          {photos.some((p) => p.takenAt) && (
            <button
              onClick={arrumarPeloBotao}
              disabled={saving}
              className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-titanium/45 hover:text-titanium/80 transition-colors px-3 py-2 disabled:opacity-40"
            >
              <Clock size={12} /> Ordenar por data e numerar
            </button>
          )}
          {photos.length > 0 && (
            <button
              onClick={() => setEscolhidas(aEscolher ? null : new Set())}
              disabled={saving}
              className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-titanium/45 hover:text-titanium/80 transition-colors px-3 py-2 disabled:opacity-40"
            >
              <CheckSquare size={13} /> {aEscolher ? 'Sair da selecção' : 'Selecionar'}
            </button>
          )}
          <button
            onClick={() => fileInput.current?.click()}
            disabled={Boolean(upload)}
            className="inline-flex items-center gap-2.5 bg-titanium text-eerie px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] font-semibold active:scale-95 transition-all min-h-[44px] disabled:opacity-60 disabled:cursor-wait"
          >
            <Upload size={14} />
            {upload ? `A enviar ${upload.done}/${upload.total}` : 'Adicionar ficheiros'}
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

        <label className="flex items-center gap-3 mb-5 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={shrink}
            onChange={(e) => setShrink(e.target.checked)}
            className="w-4 h-4 accent-[#fcfff0]"
          />
          <span className="text-xs text-titanium/50">
            Reduzir fotos para {DELIVERY_EDGE}px no lado maior. Ocupa 3 a 5
            vezes menos, sem diferença visível para o cliente. Vídeos sobem
            sempre intactos.
          </span>
        </label>

        {upload && (
          <div className="mb-6">
            <div className="h-px bg-white/10 overflow-hidden">
              <div
                className="h-full bg-titanium transition-[width] duration-300"
                style={{ width: `${Math.round((upload.done / upload.total) * 100)}%` }}
              />
            </div>
            {/*
              A conversão de um vídeo demora o tempo do próprio vídeo, e durante
              esse tempo a barra de cima não mexe. Esta linha diz porquê.
            */}
            {conversao && (
              <p className="text-xs text-titanium/40 mt-2">
                A preparar a versão leve de “{conversao.nome}” — {conversao.percentagem}%.
                Demora o tempo do vídeo. Deixa a página aberta.
              </p>
            )}
          </div>
        )}

        {pesados.length > 0 && (
          <p className="text-[13px] leading-relaxed text-amber-300/80 mb-5 max-w-2xl">
            {pesados.length === 1
              ? `Um vídeo está acima dos ${TECTO_MBPS} Mbps e vai encravar num telemóvel.`
              : `${pesados.length} vídeos estão acima dos ${TECTO_MBPS} Mbps e vão encravar num telemóvel.`}
            {' '}Carrega em "Preparar os vídeos" aqui em cima: faz-se uma cópia a 720p em H.264
            que corre em qualquer lado, e o original fica guardado para o download. No computador
            corre à mesma, por isso é fácil não dar por isto.
          </p>
        )}

        {emVp.length > 0 && (
          <p className="text-[13px] leading-relaxed text-amber-300/80 mb-5 max-w-2xl">
            {emVp.length === 1 ? 'A cópia leve de um vídeo saiu' : `As cópias leves de ${emVp.length} vídeos saíram`}
            {' '}em WebM e não em H.264. Um iPhone lê WebM mas descodifica-o por software, e pode
            travar à mesma por mais leve que o ficheiro esteja. Ou a cópia é antiga, de quando isto
            saía sempre em WebM, ou este browser não sabe fazer H.264: prepara outra vez, e se
            continuar a sair WebM faz num Chrome ou Edge actualizados.
          </p>
        )}

        {recado && (
          <p className="text-[13px] leading-relaxed text-amber-300/80 mb-5 max-w-xl">{recado}</p>
        )}

        {photos.length === 0 ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleFiles(e.dataTransfer.files)
            }}
            className="border border-dashed border-white/15 rounded-2xl p-12 text-center"
          >
            <Upload size={24} className="mx-auto text-titanium/25 mb-4" />
            <p className="text-sm text-titanium/45">
              Arrasta as fotos para aqui, ou usa o botão acima.
            </p>
          </div>
        ) : (
          <>
            {aEscolher ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
                <span className="text-xs text-titanium/60">
                  {escolhidas.size === 0
                    ? 'Toca nas fotografias que queres apagar.'
                    : `${escolhidas.size} de ${photos.length} ${escolhidas.size === 1 ? 'escolhida' : 'escolhidas'}.`}
                </span>
                <button
                  onClick={() => setEscolhidas(new Set(photos.map((p) => p.id)))}
                  className="text-[10px] uppercase tracking-[0.15em] text-titanium/45 hover:text-titanium/80 transition-colors"
                >
                  Todas
                </button>
                {escolhidas.size > 0 && (
                  <button
                    onClick={() => setEscolhidas(new Set())}
                    className="text-[10px] uppercase tracking-[0.15em] text-titanium/45 hover:text-titanium/80 transition-colors"
                  >
                    Limpar
                  </button>
                )}
                <button
                  onClick={apagarEscolhidas}
                  disabled={escolhidas.size === 0 || aApagar}
                  className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-red-300/80 hover:text-red-300 transition-colors disabled:opacity-30"
                >
                  <Trash2 size={13} />
                  {aApagar
                    ? 'A apagar…'
                    : `Apagar${escolhidas.size ? ` ${escolhidas.size}` : ''}`}
                </button>
              </div>
            ) : (
              <p className="text-xs text-titanium/30 mb-4">
                Arrasta para reordenar, ou usa as setas em cada foto. O arrasto
                não funciona ao toque. É esta a ordem que o cliente vê.
              </p>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
              {photos.map((photo, i) => (
                <div
                  key={photo.id}
                  /*
                    A escolher, o cartão deixa de se arrastar e passa a ser um
                    interruptor. As duas coisas ao mesmo tempo não funcionam:
                    arrastar começa com o dedo em cima da fotografia, que é
                    exactamente o gesto de a escolher.
                  */
                  {...(aEscolher
                    ? {
                        role: 'checkbox',
                        'aria-checked': escolhidas.has(photo.id),
                        tabIndex: 0,
                        onClick: () => alternar(photo.id),
                        onKeyDown: (e: React.KeyboardEvent) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault()
                            alternar(photo.id)
                          }
                        },
                      }
                    : propsDe(i))}
                  className={`relative group rounded-lg overflow-hidden aspect-square bg-white/[0.04] ${
                    aEscolher
                      ? `cursor-pointer ${escolhidas.has(photo.id) ? 'ring-2 ring-titanium' : 'opacity-70 hover:opacity-100'}`
                      : 'cursor-grab active:cursor-grabbing'
                  } ${aArrastar === i ? 'opacity-40' : ''}`}
                >
                  {/*
                    Um vídeo sem miniatura não entra numa `<img>`: o browser não
                    o desenha e descarrega-o inteiro para nada. Aqui dá-se por
                    isso, porque é aqui que se corrige.
                  */}
                  {photo.thumbPath || !isVideo(photo) ? (
                    <img
                      src={thumbs[photo.id] ?? ''}
                      alt={photo.fileName}
                      loading="lazy"
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <span className="absolute inset-0 bg-white/[0.04]" />
                  )}
                  <div className="absolute inset-0 bg-eerie/0 group-hover:bg-eerie/50 transition-colors" />
                  {/*
                    O triângulo deixa de ser um enfeite e passa a abrir o vídeo
                    com os números à frente. É assim que se descobre, no próprio
                    telemóvel, se um vídeo que trava está a parar por falta de
                    rede ou a deixar cair imagens por falta de descodificador.
                  */}
                  {isVideo(photo) && !aEscolher && (
                    <button
                      onClick={() => setProva(photo)}
                      aria-label={`Testar ${photo.fileName}`}
                      title="Ver e medir"
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="w-8 h-8 rounded-full bg-eerie/60 flex items-center justify-center">
                        <Play size={12} className="text-titanium ml-0.5" fill="currentColor" />
                      </span>
                    </button>
                  )}
                  {/*
                    O débito do vídeo, por baixo. Sem este número, "não corre no
                    telemóvel" é um mistério; com ele é uma conta que se resolve
                    exportando o ficheiro outra vez.
                  */}
                  {isVideo(photo) && debito(photo) !== null && (
                    <span
                      className={`absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded text-[9px] text-center pointer-events-none ${
                        (!photo.previewPath && debito(photo)! > TECTO_MBPS)
                        || /vp0?8|vp0?9|webm/i.test(photo.previewType ?? '')
                          ? 'bg-amber-300/90 text-eerie'
                          : 'bg-eerie/70 text-titanium/70'
                      }`}
                    >
                      {photo.previewPath
                        ? [
                            /webm/i.test(photo.previewType ?? '') ? 'WebM' : 'H.264',
                            photo.previewBytes ? `${Math.round(photo.previewBytes / 1024 ** 2)} MB` : null,
                          ].filter(Boolean).join(' · ')
                        : `${debito(photo)!.toFixed(1)} Mbps${photo.height ? ` · ${photo.height}p` : ''}`}
                    </span>
                  )}

                  {aEscolher && escolhidas.has(photo.id) && (
                    <span className="absolute inset-0 flex items-center justify-center bg-eerie/40">
                      <span className="w-7 h-7 rounded-full bg-titanium flex items-center justify-center">
                        <Check size={16} className="text-eerie" strokeWidth={3} />
                      </span>
                    </span>
                  )}

                  {!aEscolher && (
                    <>
                      <button
                        onClick={() => patch({ coverPhotoId: photo.id })}
                        aria-label={`Usar ${photo.fileName} como capa`}
                        title="Usar como capa"
                        className={`absolute top-1 left-1 p-2 transition-colors ${
                          gallery.coverPhotoId === photo.id
                            ? 'text-amber-300'
                            : 'text-titanium/70 sm:text-titanium/0 sm:group-hover:text-titanium/70 hover:!text-amber-300'
                        }`}
                      >
                        <Star size={15} fill={gallery.coverPhotoId === photo.id ? 'currentColor' : 'none'} />
                      </button>

                      <button
                        onClick={() => removePhoto(photo)}
                        aria-label={`Apagar ${photo.fileName}`}
                        className="absolute top-1 right-1 p-2 text-titanium/70 sm:text-titanium/0 sm:group-hover:text-titanium/70 hover:!text-red-300 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}

                  {/*
                    O arrasto HTML5 não existe em ecrãs de toque, por isso a
                    ordenação ficaria impossível no telemóvel. As setas são
                    sempre visíveis ao toque e aparecem com o rato no desktop.
                  */}
                  {!aEscolher && (
                  <div className="absolute bottom-1 inset-x-1 flex justify-between sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => move(i, i - 1)}
                      disabled={i === 0}
                      aria-label={`Mover ${photo.fileName} para trás`}
                      className="p-1.5 rounded-full bg-eerie/70 text-titanium/80 hover:text-titanium disabled:opacity-0"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => move(i, i + 1)}
                      disabled={i === photos.length - 1}
                      aria-label={`Mover ${photo.fileName} para a frente`}
                      className="p-1.5 rounded-full bg-eerie/70 text-titanium/80 hover:text-titanium disabled:opacity-0"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                  )}
                  <span className="absolute top-7 inset-x-0 px-1.5 text-[9px] text-titanium/0 group-hover:text-titanium/60 truncate transition-colors">
                    {photo.fileName}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Capa ────────────────────────────────────────────── */}
      <section className="mb-14 max-w-2xl">
        <h2 className="text-xl mb-2">Capa</h2>
        <p className="text-xs text-titanium/35 mb-6 leading-relaxed">
          É o primeiro ecrã que o cliente vê. Escolhe a fotografia clicando na
          estrela de uma das miniaturas acima. Sem escolha, usa a primeira.
        </p>

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="sm:col-span-2">
            <label className="label-sm block mb-2.5" htmlFor="ge-cover-title">
              Texto sobre a capa
            </label>
            <input
              id="ge-cover-title"
              defaultValue={gallery.coverTitle ?? ''}
              onBlur={(e) =>
                e.target.value !== (gallery.coverTitle ?? '') && patch({ coverTitle: e.target.value })
              }
              className={field}
              placeholder={gallery.title}
            />
            <p className="text-xs text-titanium/25 mt-2">Vazio usa o título da galeria.</p>
          </div>

          <div>
            <label className="label-sm block mb-2.5" htmlFor="ge-font">Tipo de letra</label>
            <select
              id="ge-font"
              value={gallery.coverFont}
              onChange={(e) => patch({ coverFont: e.target.value as CoverFont })}
              className={`${field} bg-eerie`}
            >
              {Object.entries(COVER_FONTS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-sm block mb-2.5" htmlFor="ge-logo">Logo na capa</label>
            <select
              id="ge-logo"
              value={gallery.logoVariant}
              onChange={(e) => patch({ logoVariant: e.target.value as LogoVariant })}
              className={`${field} bg-eerie`}
            >
              {Object.entries(LOGO_VARIANTS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Pré-visualização do texto tal como sai na capa. */}
        <div className="mt-7 border border-white/10 rounded-2xl p-8 text-center bg-white/[0.02]">
          <span className="label-sm block mb-4 text-titanium/25">Pré-visualização</span>
          {LOGO_VARIANTS[gallery.logoVariant]?.src && (
            <img
              src={LOGO_VARIANTS[gallery.logoVariant].src!}
              alt=""
              className={`h-8 w-auto mx-auto mb-5 ${
                gallery.logoVariant === 'black' ? 'invert-0' : ''
              }`}
            />
          )}
          <p
            className={`${COVER_FONTS[gallery.coverFont]?.className ?? ''} leading-tight`}
            style={{ fontSize: gallery.coverFont === 'label' ? '1.1rem' : '2rem' }}
          >
            {gallery.coverTitle?.trim() || gallery.title}
          </p>
        </div>
      </section>

      {/* ── Definições ──────────────────────────────────────── */}
      <section className="mb-14 max-w-2xl">
        <h2 className="text-xl mb-6">Definições</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="label-sm block mb-2.5" htmlFor="ge-title">Título</label>
            <input
              id="ge-title"
              defaultValue={gallery.title}
              onBlur={(e) => e.target.value !== gallery.title && patch({ title: e.target.value })}
              className={field}
            />
          </div>
          <div>
            <label className="label-sm block mb-2.5" htmlFor="ge-slug">Código (URL)</label>
            {/*
              O código é limpo antes de ser guardado, tal como no formulário de
              criação. Aqui era guardado tal como se escrevia — e como o acesso
              compara em minúsculas, um código com maiúsculas, espaços ou "&"
              deixava de bater certo consigo próprio: a galeria passava a
              recusar a password certa e o link novo, sem dizer porquê.

              O valor limpo volta ao campo, para se ver o que ficou gravado em
              vez de se ficar a olhar para o que se escreveu.
            */}
            <input
              id="ge-slug"
              defaultValue={gallery.slug}
              onBlur={(e) => {
                const limpo = slugify(e.target.value)
                e.target.value = limpo
                if (limpo && limpo !== gallery.slug) patch({ slug: limpo })
              }}
              className={field}
            />
          </div>
          <div>
            <label className="label-sm block mb-2.5" htmlFor="ge-client">Cliente</label>
            <input
              id="ge-client"
              defaultValue={gallery.clientName ?? ''}
              onBlur={(e) =>
                e.target.value !== (gallery.clientName ?? '') && patch({ clientName: e.target.value })
              }
              className={field}
            />
          </div>
          <div>
            <label className="label-sm block mb-2.5" htmlFor="ge-expires">Expira em (opcional)</label>
            <input
              id="ge-expires"
              type="date"
              defaultValue={gallery.expiresAt ? gallery.expiresAt.slice(0, 10) : ''}
              onBlur={(e) =>
                patch({ expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null })
              }
              className={`${field} [color-scheme:dark]`}
            />
            <p className="text-[10px] text-titanium/25 mt-1.5 leading-relaxed">
              Depois desta data a galeria deixa de abrir. O cliente vê o prazo
              na galeria, e a partir de 30 dias antes o aviso passa a destacado
              Ninguém deve perder as fotografias por não ter sido avisado.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <label className="label-sm block mb-2.5" htmlFor="ge-message">
            Mensagem para o cliente (opcional)
          </label>
          <textarea
            id="ge-message"
            rows={3}
            defaultValue={gallery.message ?? ''}
            onBlur={(e) =>
              e.target.value !== (gallery.message ?? '') && patch({ message: e.target.value })
            }
            className={`${field} resize-none`}
            placeholder="As primeiras do vosso dia. O resto segue durante a semana."
          />
        </div>

        <label className="flex items-center gap-3 mt-7 cursor-pointer">
          <input
            type="checkbox"
            checked={gallery.downloadEnabled}
            onChange={(e) => patch({ downloadEnabled: e.target.checked })}
            className="w-4 h-4 accent-[#fcfff0]"
          />
          <span className="text-sm text-titanium/70">Permitir download das fotografias</span>
        </label>

        {/*
          O travão de tentativas, por galeria. Existe para se poder testar uma
          entrega sem ficar trancado à décima vez que se engana a password.
        */}
        <label className="flex items-start gap-3 mt-5 cursor-pointer">
          <input
            type="checkbox"
            checked={gallery.lockAttempts}
            onChange={(e) => patch({ lockAttempts: e.target.checked })}
            className="w-4 h-4 accent-[#fcfff0] mt-0.5"
          />
          <span className="text-sm text-titanium/70">
            Fechar o acesso ao fim de 10 tentativas falhadas numa hora
            <span className="block text-xs text-titanium/40 mt-1">
              {gallery.lockAttempts
                ? 'Protege contra quem anda a adivinhar a password. Desliga para testar.'
                : 'Desligado: qualquer número de tentativas é aceite. Volta a ligar antes de entregar.'}
            </span>
          </span>
        </label>
      </section>

      {/* ── Atividade ───────────────────────────────────────── */}
      <GalleryFavorites galleryId={gallery.id} photos={photos} />

      <GalleryActivity galleryId={gallery.id} />

      {/* ── Password ────────────────────────────────────────── */}
      <section className="mb-14 max-w-2xl">
        <h2 className="text-xl mb-2">Password</h2>
        <p className="text-xs text-titanium/35 mb-5 leading-relaxed">
          A password atual não pode ser lida: está guardada cifrada. Se o
          cliente a perder, define uma nova aqui.
        </p>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="label-sm block mb-2.5" htmlFor="ge-pass">Nova password</label>
            <input
              id="ge-pass"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={field}
              placeholder="deixa vazio para manter"
            />
          </div>
          <button
            type="button"
            onClick={() => setNewPassword(suggestPassword())}
            className="text-[10px] uppercase tracking-[0.15em] text-titanium/45 hover:text-titanium/80 transition-colors px-3 py-3"
          >
            Gerar
          </button>
          <button
            onClick={async () => {
              if (!newPassword) return
              await patch({ password: newPassword })
              // Guardada na sessão: é a única altura em que a sabemos, e é
              // logo a seguir que se quer copiá-la para mandar ao cliente.
              guardarPassword(gallery.id, newPassword)
              setNewPassword('')
            }}
            disabled={!newPassword || saving}
            className="border border-white/20 px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] text-titanium/75 hover:border-white/40 transition-all min-h-[44px] disabled:opacity-40"
          >
            Alterar
          </button>
        </div>
      </section>

      {/* ── Zona perigosa ───────────────────────────────────── */}
      <section className="border-t border-white/[0.08] pt-8 max-w-2xl">
        <button
          onClick={removeGallery}
          className="inline-flex items-center gap-2.5 border border-red-400/25 text-red-300/80 px-6 py-3 rounded-full text-[11px] uppercase tracking-[0.18em] hover:border-red-400/50 hover:text-red-300 transition-all min-h-[44px]"
        >
          <Trash2 size={14} />
          Apagar galeria
        </button>
      </section>

      {prova && <ProvaDeVideo photo={prova} aoFechar={() => setProva(null)} />}

      {/*
        Nomes repetidos: a pergunta antes de carregar.

        Uma janela e não um `confirm` do browser, porque há três respostas e não
        duas, e porque a do meio precisa de mostrar o nome que vai sair.
      */}
      {repetidos && (
        <div
          className="fixed inset-0 z-[120] bg-eerie/90 flex items-center justify-center p-6"
          onClick={() => setRepetidos(null)}
        >
          <div
            className="w-full max-w-md bg-eerie border border-titanium/15 rounded-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-titanium/90 mb-2">
              {repetidos.nomes.length === 1
                ? 'Já existe um ficheiro com este nome:'
                : `Já existem ${repetidos.nomes.length} ficheiros com estes nomes:`}
            </p>
            <ul className="text-[13px] text-titanium/55 mb-5 space-y-0.5">
              {repetidos.nomes.slice(0, 4).map((n) => (
                <li key={n} className="truncate">{n}</li>
              ))}
              {repetidos.nomes.length > 4 && (
                <li className="text-titanium/35">e mais {repetidos.nomes.length - 4}.</li>
              )}
            </ul>

            <button
              onClick={renomearRepetidos}
              className="w-full text-left px-4 py-3 rounded-lg border border-titanium/20 hover:border-titanium/50 transition-colors"
            >
              <span className="text-titanium">Guardar os dois</span>
              <span className="block text-[13px] leading-relaxed text-titanium/50 mt-1">
                O novo entra com uma letra no nome:{' '}
                {nomeLivre(repetidos.nomes[0], new Set(photos.map((p) => p.fileName.toLowerCase())))}
              </span>
            </button>

            <button
              onClick={substituirRepetidos}
              className="w-full text-left px-4 py-3 mt-3 rounded-lg border border-titanium/20 hover:border-titanium/50 transition-colors"
            >
              <span className="text-titanium">Substituir</span>
              <span className="block text-[13px] leading-relaxed text-titanium/50 mt-1">
                {repetidos.nomes.length === 1 ? 'A fotografia antiga é apagada' : 'As fotografias antigas são apagadas'}
                {' '}e fica a nova. Não há como recuperar.
              </span>
            </button>

            <button
              onClick={() => setRepetidos(null)}
              className="w-full mt-4 py-2 label-sm text-titanium/50 hover:text-titanium/80 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
