/**
 * Entregar um ficheiro a quem está a ver, da melhor maneira que o aparelho der.
 *
 * Dois caminhos, e o primeiro existe só por causa do iPhone.
 *
 * Um link para um endereço que o R2 entrega como anexo descarrega — mas no iOS
 * descarrega para os Ficheiros, não para as Fotos, e num vídeo o Safari muitas
 * vezes nem descarrega: abre o leitor. Quem acabou de ver uma fotografia do
 * casamento quer que ela apareça na galeria do telemóvel.
 *
 * O menu de partilha do iOS resolve as duas coisas: leva lá dentro "Guardar
 * imagem" e "Guardar vídeo", que escrevem mesmo na galeria. Só que obriga a
 * trazer o ficheiro para memória, o que precisa de CORS no bucket e de o
 * ficheiro não ser enorme. Quando qualquer uma dessas condições falha, cai-se
 * no link, que funciona sempre — mal, mas sempre.
 *
 * Em Android o mesmo menu abre uma lista de aplicações sem opção nenhuma de
 * guardar, por isso lá não se usa: vai-se directo ao download, que escreve nas
 * transferências e aparece no Fotos, na pasta do aparelho.
 */

/*
  O tecto para passar pelo menu de partilha.

  Partilhar obriga a ter o ficheiro inteiro em memória, e um vídeo de casamento
  de trezentos megabytes num telemóvel com pouca memória fecha o separador. Daí
  para cima vai pelo caminho normal, que escreve em disco à medida que chega.
*/
const CABE_NA_PARTILHA = 150 * 1024 * 1024

/**
 * Abre o download de um endereço que já vem com o cabeçalho de anexo.
 *
 * Sem o atributo `download`: entre domínios diferentes ele é ignorado e, em
 * alguns browsers, a sua presença faz o link abrir num separador em vez de
 * descarregar. Quem manda no nome do ficheiro é o cabeçalho que vem do R2.
 */
export function abrirDownload(url: string) {
  const a = document.createElement('a')
  a.href = url
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/**
 * Se vale a pena oferecer o menu de partilha neste aparelho.
 *
 * Só em ecrãs de toque. Num computador o menu não resolve nada — o que a pessoa
 * quer é o ficheiro na pasta das transferências — e traz um problema a sério:
 * o `navigator.share` existe no Chrome de secretária e pode recusar com
 * `AbortError`, que é indistinguível de alguém ter cancelado. Como a cancelar
 * não se abre download nenhum, o resultado era carregar em descarregar e não
 * acontecer nada.
 *
 * Num telemóvel essa ambiguidade não custa: se o menu abriu e a pessoa fechou,
 * ela sabe o que fez.
 */
const ecraDeToque = () =>
  typeof navigator !== 'undefined' &&
  typeof window !== 'undefined' &&
  (navigator.maxTouchPoints > 0 || window.matchMedia?.('(pointer: coarse)').matches)

/**
 * Se o aparelho é um iPhone ou um iPad.
 *
 * Um iPad recente diz que é um Mac no `userAgent`, e a única coisa que o
 * denuncia é ter ecrã de toque: um Mac verdadeiro tem `maxTouchPoints` a zero.
 */
const ehIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

/** Verdadeiro se o ficheiro chegou a ir para o menu de partilha do sistema. */
export async function tentarPartilhar(
  url: string, nome?: string, tipo?: string | null, bytes?: number,
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.canShare || !navigator.share) return false
  /*
    Só em iOS, e isto custou uma queixa de um cliente para se perceber.

    O menu que o `navigator.share` abre não é o mesmo nos dois sistemas. Em iOS
    é o menu de partilha do próprio sistema e traz lá dentro "Guardar imagem" e
    "Guardar vídeo", que escrevem mesmo na galeria do telefone, que é o ponto
    todo disto. Em Android traz uma lista de aplicações — WhatsApp, Gmail,
    Snapseed — e nenhuma opção de guardar: quem quisesse ficar com a fotografia
    não tinha ali maneira de o fazer.

    Em Android o caminho normal é melhor: o ficheiro desce para as
    transferências, aparece a notificação do costume e o Fotos mostra-o na pasta
    do aparelho. Nenhuma página web consegue escrever directamente na galeria do
    Android, e fingir que sim era o que estávamos a fazer.
  */
  if (!ehIOS()) return false
  if (bytes && bytes > CABE_NA_PARTILHA) return false

  try {
    /*
      `no-store` não é por causa de dados velhos. A mesma fotografia já foi
      buscada por uma `<img>`, e uma `<img>` não é um pedido de CORS: o browser
      guardou essa resposta sem cabeçalhos de CORS, porque nunca foram pedidos.
      Pedi-la agora por `fetch` devolvia essa cópia guardada, sem o
      `Access-Control-Allow-Origin`, e o browser recusava — com a mesma
      mensagem que dá um bucket mal configurado, estando o bucket impecável.
    */
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return false
    const blob = await res.blob()
    const ficheiro = new File([blob], nome || 'nebula', {
      type: tipo || blob.type || 'application/octet-stream',
    })
    if (!navigator.canShare({ files: [ficheiro] })) return false
    await navigator.share({ files: [ficheiro] })
    return true
  } catch (e) {
    /*
      Num ecrã de toque, `AbortError` é quase sempre alguém a fechar o menu que
      viu abrir — e abrir-lhe um download a seguir seria fazer exactamente o que
      acabou de recusar. Chega-se aqui só em ecrãs de toque, por causa do
      travão lá em cima.
    */
    if ((e as Error)?.name === 'AbortError') return true
    return false
  }
}

/**
 * O caminho completo: tenta o menu, e cai no ficheiro quando não dá.
 *
 * Em Android e em tudo o que não seja iOS, este é o caminho único: o menu de
 * partilha de lá não sabe guardar na galeria, e o download normal sabe.
 *
 * Em ecrã de toque a queda não é um `<a>` sintético. Um iOS ignora um clique
 * que o código inventa a seguir a uma espera — não veio de um gesto — e o
 * resultado é carregar em descarregar e não acontecer absolutamente nada. Uma
 * navegação para o endereço acontece sempre: o ficheiro abre, e a partir daí o
 * próprio sistema oferece guardá-lo.
 */
/**
 * O mesmo, para um ficheiro que já está em memória.
 *
 * Serve o caminho em que o ficheiro teve de ser trazido pelo `fetch` em vez de
 * ser entregue por um endereço de anexo. Sem isto, esse caminho era um `<a>`
 * sintético, ou seja o defeito que já custou duas rondas a corrigir no outro
 * caminho: em iOS um clique que o código inventa a seguir a uma espera é
 * ignorado, e não acontece nada.
 */
export async function guardarBlob(blob: Blob, nome: string, tipo?: string | null) {
  if (ehIOS() && navigator.canShare && navigator.share && blob.size <= CABE_NA_PARTILHA) {
    try {
      const ficheiro = new File([blob], nome, { type: tipo || blob.type || 'application/octet-stream' })
      if (navigator.canShare({ files: [ficheiro] })) {
        await navigator.share({ files: [ficheiro] })
        return
      }
    } catch (e) {
      // Fechar o menu é uma resposta, e a resposta foi não.
      if ((e as Error)?.name === 'AbortError') return
    }
  }
  descarregarBlob(blob, nome)
}

/** Um ficheiro em memória, entregue pelo caminho normal do browser. */
export function descarregarBlob(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revogar de imediato cancela downloads em curso nalguns browsers.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export async function guardarFicheiro(
  url: string, nome?: string, tipo?: string | null, bytes?: number,
): Promise<void> {
  if (await tentarPartilhar(url, nome, tipo, bytes)) return
  if (ecraDeToque()) {
    window.location.href = url
    return
  }
  abrirDownload(url)
}
