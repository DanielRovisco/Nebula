import { Link } from 'react-router-dom'
import Reveal from '../lib/Reveal'
import Seo from '../lib/Seo'
import { CONTACT } from '../lib/site'

/**
 * Última revisão do texto. Sempre que se mexer no conteúdo desta página, mudar
 * também esta data — quem lê uma política de privacidade quer saber de quando é.
 */
const ATUALIZADO = '16 de agosto de 2026'

/**
 * Identificação do responsável pelo tratamento. Assim que houver empresa
 * constituída (ou atividade aberta em nome individual), preencher `entidade`,
 * `nif` e `morada` — o RGPD obriga a identificar quem trata os dados, e um nome
 * de marca sozinho não chega.
 */
const RESPONSAVEL = {
  entidade: 'NEBULA',
  nif: null as string | null,
  morada: null as string | null,
}

const SECOES = [
  {
    titulo: 'Quem trata os teus dados',
    corpo: (
      <>
        <p>
          Os dados recolhidos neste site são tratados pela {RESPONSAVEL.entidade}
          {RESPONSAVEL.nif ? `, NIF ${RESPONSAVEL.nif}` : ''}
          {RESPONSAVEL.morada ? `, com morada em ${RESPONSAVEL.morada}` : ''}, que
          presta serviços de fotografia e vídeo em Portugal.
        </p>
        <p>
          Para qualquer questão sobre privacidade, o contacto é{' '}
          <a href={`mailto:${CONTACT.email}`} className="underline underline-offset-4 hover:text-titanium">
            {CONTACT.email}
          </a>
          .
        </p>
      </>
    ),
  },
  {
    titulo: 'Que dados recolhemos, e porquê',
    corpo: (
      <>
        <p>
          <strong className="text-titanium/85">Formulário de contacto.</strong> Nome,
          email, tipo de serviço e, se os indicares, a data e o local do evento,
          além da mensagem que escreveres. Servem apenas para te responder e
          preparar uma proposta. A base legal é o teu pedido — sem estes dados não
          conseguimos responder.
        </p>
        <p>
          <strong className="text-titanium/85">Galerias privadas.</strong> Quando és
          nosso cliente, criamos uma galeria protegida por password com as
          fotografias e os vídeos da tua sessão. Guardamos o nome que dá título à
          galeria e um registo técnico de quando foi aberta e do que foi
          descarregado. Esse registo existe para percebermos se a entrega chegou
          bem e para detetarmos acessos indevidos; não guardamos o teu endereço IP
          nem qualquer identificador de dispositivo.
        </p>
        <p>
          <strong className="text-titanium/85">Estatísticas do site.</strong> Usamos
          uma ferramenta de estatísticas sem cookies, que conta visitas de forma
          agregada e anónima. Não é possível identificar-te a partir dela, não
          seguimos ninguém entre sites, e é por isso que este site não te chateia
          com um aviso de cookies.
        </p>
        <p>
          Não recolhemos dados sensíveis, não fazemos decisões automatizadas sobre
          ti e nunca vendemos nem cedemos os teus dados a terceiros para fins
          comerciais.
        </p>
      </>
    ),
  },
  {
    titulo: 'Quem mais lhes toca',
    corpo: (
      <>
        <p>
          Para o site funcionar recorremos a fornecedores que tratam dados por
          nossa conta e apenas segundo as nossas instruções:
        </p>
        <ul className="space-y-2 mt-4">
          {[
            'GitHub Pages — alojamento do site.',
            'Supabase — base de dados das galerias e autenticação do nosso painel.',
            'Cloudflare R2 — armazenamento das fotografias e vídeos.',
            'Serviço de envio do formulário — encaminha para o nosso email a mensagem que escreves.',
            'Ferramenta de estatísticas sem cookies — contagem agregada de visitas.',
          ].map((f) => (
            <li key={f} className="flex gap-3 text-titanium/55">
              <span className="text-titanium/25 shrink-0">—</span>
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-4">
          Alguns destes fornecedores são norte-americanos e podem tratar dados
          fora da União Europeia, ao abrigo das cláusulas contratuais-tipo da
          Comissão Europeia.
        </p>
      </>
    ),
  },
  {
    titulo: 'Quanto tempo ficam connosco',
    corpo: (
      <>
        <p>
          As mensagens de contacto ficam no nosso email enquanto durar a conversa
          e, se não avançar para trabalho, até um ano depois.
        </p>
        <p>
          As galerias de cliente têm uma data de validade definida na entrega —
          normalmente alguns meses — e avisamos-te antes de fecharem, para teres
          tempo de descarregar tudo. Findo esse prazo, a galeria é fechada e os
          ficheiros são eliminados do nosso armazenamento. Guardamos os originais
          do trabalho enquanto for razoável para o nosso arquivo profissional.
        </p>
      </>
    ),
  },
  {
    titulo: 'Fotografias e direitos de imagem',
    corpo: (
      <>
        <p>
          As fotografias e vídeos que fazemos são obras nossas, e é ao contrato de
          cada trabalho que cabe definir o que cada parte pode fazer com eles.
        </p>
        <p>
          Só publicamos imagens onde apareças — no portfólio, no site ou nas redes
          sociais — se o tiveres autorizado. Se mudares de ideias, escreve-nos e
          retiramos as imagens dos nossos canais o mais depressa que conseguirmos.
        </p>
      </>
    ),
  },
  {
    titulo: 'Os teus direitos',
    corpo: (
      <>
        <p>
          Podes pedir-nos acesso aos teus dados, correção do que estiver errado,
          apagamento, limitação do tratamento, uma cópia em formato legível por
          computador, ou opor-te a determinado tratamento. Basta escreveres para{' '}
          <a href={`mailto:${CONTACT.email}`} className="underline underline-offset-4 hover:text-titanium">
            {CONTACT.email}
          </a>{' '}
          — respondemos no prazo de um mês.
        </p>
        <p>
          Se achares que não tratámos o assunto como devíamos, tens o direito de
          apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD),
          a autoridade de controlo em Portugal.
        </p>
      </>
    ),
  },
]

export default function Privacy() {
  return (
    <div className="pt-28 sm:pt-36 pb-20 sm:pb-28">
      <Seo
        title="Política de privacidade — NEBULA"
        description="Como a NEBULA trata os dados pessoais recolhidos no site: formulário de contacto, galerias privadas de cliente e estatísticas sem cookies."
      />

      <section className="container-px mb-14 sm:mb-20">
        <Reveal>
          <span className="label-sm">Privacidade</span>
          <h1 className="mt-4 max-w-3xl leading-[1.05]" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
            O que fazemos com os teus dados.
          </h1>
          <p className="text-titanium/45 text-sm mt-6">Última atualização: {ATUALIZADO}</p>
        </Reveal>
      </section>

      <section className="container-px max-w-3xl">
        {SECOES.map((s, i) => (
          <Reveal key={s.titulo} delay={Math.min(i * 0.05, 0.2)}>
            <div className="py-8 sm:py-10 border-t border-white/10">
              <h2 className="text-xl sm:text-2xl mb-5">{s.titulo}</h2>
              <div className="space-y-4 text-titanium/55 leading-relaxed text-[15px]">
                {s.corpo}
              </div>
            </div>
          </Reveal>
        ))}

        <div className="border-t border-white/10 pt-10">
          <Link to="/contacto" className="label-sm hover:text-titanium/70 transition-colors">
            ← Falar connosco
          </Link>
        </div>
      </section>
    </div>
  )
}
