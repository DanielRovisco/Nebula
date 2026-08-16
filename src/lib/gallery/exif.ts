/**
 * Data em que a fotografia foi tirada, lida do próprio ficheiro.
 *
 * Serve para ordenar a galeria pela ordem em que o dia aconteceu. Dois
 * fotógrafos no mesmo casamento entregam ficheiros com nomes que não têm nada a
 * ver uns com os outros (IMG_4821 e DSC_0093 do mesmo instante), e ordenar por
 * nome dá um dia contado aos saltos.
 *
 * É lido antes de a fotografia ser reduzida, porque a redução no browser
 * desenha para um canvas e o canvas não leva metadados nenhuns — a data
 * desaparece aí, tal como o GPS. Guardar a data e perder o resto é
 * intencional: a hora interessa-nos, as coordenadas de onde a fotografia foi
 * tirada não têm de acompanhar a entrega.
 *
 * Sem dependências externas: são uns 60 bytes de cabeçalho que se leem à mão.
 */

/** Só os primeiros 128 kB — o EXIF vive no início do ficheiro. */
const CABECALHO = 128 * 1024

export async function dataDaFotografia(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null
  try {
    const buf = await file.slice(0, CABECALHO).arrayBuffer()
    const view = new DataView(buf)
    if (view.byteLength < 4) return null
    // Todo o JPEG começa com SOI (0xFFD8).
    if (view.getUint16(0) !== 0xffd8) return null

    let pos = 2
    while (pos + 4 < view.byteLength) {
      if (view.getUint8(pos) !== 0xff) break
      const marcador = view.getUint8(pos + 1)
      const tamanho = view.getUint16(pos + 2)
      // APP1 é o segmento onde o EXIF vive.
      if (marcador === 0xe1) {
        const inicio = pos + 4
        // "Exif\0\0"
        if (view.getUint32(inicio) !== 0x45786966) return null
        return lerTiff(view, inicio + 6)
      }
      if (tamanho < 2) break
      pos += 2 + tamanho
    }
    return null
  } catch {
    // Um ficheiro que não se deixa ler não é motivo para falhar o upload.
    return null
  }
}

/** Percorre a estrutura TIFF à procura de DateTimeOriginal (0x9003). */
function lerTiff(view: DataView, tiff: number): string | null {
  if (tiff + 8 > view.byteLength) return null
  const ordem = view.getUint16(tiff)
  // 0x4949 = Intel (little-endian); 0x4D4D = Motorola (big-endian).
  const le = ordem === 0x4949
  if (!le && ordem !== 0x4d4d) return null

  const ifd0 = tiff + view.getUint32(tiff + 4, le)
  const exifIfd = procurarTag(view, tiff, ifd0, 0x8769, le)
  // A data está no IFD do EXIF; alguns ficheiros só têm DateTime no IFD0.
  const candidatos = exifIfd ? [tiff + exifIfd, ifd0] : [ifd0]

  for (const ifd of candidatos) {
    for (const tag of [0x9003, 0x9004, 0x0132]) {
      const texto = lerTextoDaTag(view, tiff, ifd, tag, le)
      const iso = paraIso(texto)
      if (iso) return iso
    }
  }
  return null
}

function entradas(view: DataView, ifd: number, le: boolean) {
  if (ifd + 2 > view.byteLength) return 0
  return Math.min(view.getUint16(ifd, le), 200)
}

function procurarTag(view: DataView, tiff: number, ifd: number, tag: number, le: boolean) {
  const n = entradas(view, ifd, le)
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12
    if (e + 12 > view.byteLength) return null
    if (view.getUint16(e, le) === tag) return view.getUint32(e + 8, le)
  }
  void tiff
  return null
}

function lerTextoDaTag(view: DataView, tiff: number, ifd: number, tag: number, le: boolean) {
  const n = entradas(view, ifd, le)
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12
    if (e + 12 > view.byteLength) return null
    if (view.getUint16(e, le) !== tag) continue
    const contagem = view.getUint32(e + 4, le)
    const offset = tiff + view.getUint32(e + 8, le)
    if (contagem < 19 || offset + 19 > view.byteLength) return null
    let s = ''
    for (let k = 0; k < 19; k++) s += String.fromCharCode(view.getUint8(offset + k))
    return s
  }
  return null
}

/** "2026:08:16 14:32:05" → ISO. O EXIF não guarda fuso horário. */
function paraIso(texto: string | null): string | null {
  if (!texto) return null
  const m = texto.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/)
  if (!m) return null
  const [, ano, mes, dia, h, min, seg] = m
  const d = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(h), Number(min), Number(seg))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
