import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, Check, ChevronDown, CloudOff, Loader2, Play, RotateCw, X } from 'lucide-react'
import type { ItemFila } from '../../lib/evento/fila'

/**
 * O que este convidado mandou, em miniaturas.
 *
 * Era uma lista de nomes de ficheiros. Um nome de ficheiro não diz nada a
 * ninguém — `IMG_4471.jpg` podia ser o bolo ou o chão — e quem acabou de
 * escolher trinta fotografias quer confirmar que escolheu as certas, não ler
 * trinta linhas de texto.
 *
 * As miniaturas vêm do próprio telemóvel, não do servidor. Aparecem antes de o
 * upload começar, continuam a aparecer sem rede, e continuam lá depois de o
 * ficheiro grande ter sido apagado do browser.
 */

const RECADOS: Record<string, string> = {
  ficheiro_grande: 'Grande demais',
  evento_cheio: 'Sem espaço',
  tipo_nao_aceite: 'Não é foto nem vídeo',
  janela_fechada: 'Os envios fecharam',
  sem_rede: 'Sem rede',
  falha_upload: 'Falhou',
  ficheiro_perdido: 'Escolhe outra vez',
}

/**
 * Endereço temporário para um blob guardado, libertado quando deixa de servir.
 *
 * O endereço é derivado do blob e não estado à parte: guardá-lo no estado
 * obrigava a um render a mais por miniatura, e com trinta fotografias isso via-
 * se. O efeito serve só para o devolver quando deixa de ser preciso — sem ele,
 * trinta fotografias deixavam trinta blobs presos em memória até a página
 * fechar, o que num telemóvel a meio de uma festa conta.
 */
function useUrlDoBlob(blob: Blob | null | undefined): string | null {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  return url
}

interface Props {
  itens: ItemFila[]
  online: boolean
  comErro: number
  aoRepetir: () => void
  aoRemover: (id: string) => void
}

export default function MinhasFotos({ itens, online, comErro, aoRepetir, aoRemover }: Props) {
  const reduzido = useReducedMotion()
  const [aberta, setAberta] = useState(false)

  const enviados = itens.filter((i) => i.estado === 'feito').length
  const porEnviar = itens.filter((i) => i.estado === 'espera' || i.estado === 'a-enviar').length

  /*
    Enquanto há coisas a acontecer, a grelha está aberta: é a única forma de a
    pessoa ver o que está a subir e o que falhou. Quando está tudo entregue,
    fecha-se.

    Fecha-se porque as mesmas fotografias aparecem a seguir na galeria de toda a
    gente, e vê-las duas vezes na mesma página faz a segunda parecer um erro.
    O que fica é uma linha discreta com o que interessa a partir daí: quantas
    foram, e a porta para apagar alguma.
  */
  const emCurso = porEnviar > 0 || comErro > 0
  const mostrarGrelha = emCurso || aberta

  if (itens.length === 0) return null

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between gap-3">
        <span className="label-sm">
          {porEnviar > 0
            ? `A enviar · ${enviados} de ${itens.length}`
            : `${enviados} ${enviados === 1 ? 'entregue' : 'entregues'}`}
        </span>

        {comErro > 0 ? (
          <button
            onClick={aoRepetir}
            className="flex items-center gap-1.5 text-xs text-titanium/55 hover:text-titanium transition-colors"
          >
            <RotateCw size={12} /> Tentar outra vez
          </button>
        ) : !emCurso ? (
          <button
            onClick={() => setAberta((v) => !v)}
            aria-expanded={aberta}
            className="flex items-center gap-1.5 text-xs text-titanium/45 hover:text-titanium/85 transition-colors"
          >
            {aberta ? 'Fechar' : 'Ver e apagar'}
            <ChevronDown
              size={13}
              className={`transition-transform duration-300 ${aberta ? 'rotate-180' : ''}`}
            />
          </button>
        ) : null}
      </div>

      {!online && (
        <p className="mt-3 flex items-center gap-2 text-xs text-titanium/50">
          <CloudOff size={13} />
          Sem rede. Está tudo guardado e sobe assim que a rede voltar.
        </p>
      )}

      <AnimatePresence initial={false}>
        {mostrarGrelha && (
          <motion.div
            key="grelha"
            initial={reduzido ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduzido ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <motion.ul layout className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
              <AnimatePresence mode="popLayout" initial={false}>
                {itens.map((item, i) => (
                  <Quadrado
                    key={item.id}
                    item={item}
                    indice={i}
                    reduzido={Boolean(reduzido)}
                    aoRemover={() => aoRemover(item.id)}
                  />
                ))}
              </AnimatePresence>
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

function Quadrado({
  item, indice, reduzido, aoRemover,
}: { item: ItemFila; indice: number; reduzido: boolean; aoRemover: () => void }) {
  const url = useUrlDoBlob(item.miniatura)
  const [aConfirmar, setAConfirmar] = useState(false)

  const aEnviar = item.estado === 'a-enviar'
  const espera = item.estado === 'espera'
  const erro = item.estado === 'erro'

  return (
    <motion.li
      layout
      initial={reduzido ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduzido ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
      transition={{
        duration: 0.4,
        // Escalonado pela ordem, mas com tecto: com trinta fotografias, um
        // atraso proporcional deixava a última a aparecer dois segundos depois
        // da primeira, e o que devia ser vivo passava a parecer lento.
        delay: reduzido ? 0 : Math.min(indice * 0.035, 0.4),
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative aspect-square rounded-xl overflow-hidden bg-white/[0.05]"
    >
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="w-full h-full flex items-center justify-center text-titanium/25">
          <Play size={20} />
        </span>
      )}

      {/*
        O véu desce à medida que o ficheiro sobe. É a barra de progresso, sem
        ser uma barra: a fotografia vai ganhando cor de baixo para cima, e
        percebe-se de relance quantas já lá estão sem ler número nenhum.
      */}
      {(aEnviar || espera) && (
        <motion.div
          className="absolute inset-x-0 top-0 bg-eerie/70 backdrop-blur-[1px]"
          animate={{ height: `${100 - Math.round(item.progresso * 100)}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      )}

      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {aEnviar && <Loader2 size={17} className="animate-spin text-titanium/85" />}
        {espera && <Loader2 size={17} className="text-titanium/35" />}
        {erro && <AlertCircle size={17} className="text-titanium/85" />}
      </span>

      {item.estado === 'feito' && (
        <motion.span
          initial={reduzido ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
          className="absolute bottom-1.5 left-1.5 w-5 h-5 rounded-full bg-titanium/90 text-eerie flex items-center justify-center"
        >
          <Check size={12} strokeWidth={3} />
        </motion.span>
      )}

      {erro && (
        <span className="absolute inset-x-0 bottom-0 px-1.5 py-1 text-[10px] text-center truncate bg-eerie/85 text-titanium/75">
          {RECADOS[item.erro ?? ''] ?? 'Falhou'}
        </span>
      )}

      {/*
        Confirmar dentro do próprio quadrado, e não numa caixa do browser. A
        caixa do sistema tira a pessoa da página, aparece com o tipo de letra do
        telemóvel e não mostra qual é a fotografia que vai desaparecer — que é
        justamente a única coisa que ela precisa de ver para decidir.
      */}
      <AnimatePresence>
        {aConfirmar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-eerie/88 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 px-2"
          >
            <span className="text-[11px] text-titanium/70 text-center leading-tight">Apagar?</span>
            <div className="flex gap-1.5">
              <button
                onClick={aoRemover}
                className="px-2.5 py-1.5 rounded-full bg-titanium text-eerie text-[10px] uppercase tracking-wider"
              >
                Sim
              </button>
              <button
                onClick={() => setAConfirmar(false)}
                className="px-2.5 py-1.5 rounded-full border border-white/20 text-titanium/70 text-[10px] uppercase tracking-wider"
              >
                Não
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!aConfirmar && (
        <button
          onClick={() => setAConfirmar(true)}
          aria-label="Apagar esta"
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-eerie/65 text-titanium/70 flex items-center justify-center hover:bg-eerie/90 hover:text-titanium transition-colors"
        >
          <X size={12} />
        </button>
      )}
    </motion.li>
  )
}
