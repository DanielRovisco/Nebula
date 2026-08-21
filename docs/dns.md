# DNS do proj3ctnebula.pt

Inventário da zona tal como a Amen a criou no registo (20-08-2026), e o que
fica no fim da migração para a Cloudflare.

Existe porque assim que os nameservers mudam, a zona da Amen deixa de ser
consultada e deixa de haver de onde copiar. Se um dia o email deixar de
chegar, é aqui que se compara.

---

## Zona original na Amen

| Nome | Tipo | Valor | Destino |
|---|---|---|---|
| `@` | SOA | `ns1.amenworld.com root.amen.fr` | descartado — a Cloudflare cria o seu |
| `@` | NS | `ns1.amenworld.com.` | descartado — substituído |
| `@` | NS | `ns2.amenworld.com.` | descartado — substituído |
| `@` | A | `81.88.57.70` | **apagado** — parking da Amen |
| `@` | MX 10 | `mail-pt.securemail.pro.` | mantido |
| `@` | TXT | `v=spf1 include:spf.webapps.net ~all` | mantido |
| `_autodiscover._tcp` | SRV | `10 10 443 ms-pt.securemail.pro` | mantido |
| `autoconfig` | CNAME | `tb-pt.securemail.pro.` | mantido |
| `ftp` | CNAME | `proj3ctnebula.pt.` | **apagado** — não há FTP |
| `mail` | CNAME | `mail-pt.securemail.pro.` | mantido |
| `pim` | CNAME | `pim-pt.webapps.net.` | mantido |
| `smtp` | CNAME | `smtp-pt.securemail.pro.` | mantido |
| `webmail` | CNAME | `webmail-pt.setupdns.net.` | mantido |
| `www` | CNAME | `onstatic-pt.setupdns.net.` | **substituído** — apontava ao site da Amen |

O `ftp` apontava para o próprio domínio, ou seja, para o parking. Assim que o
`@` passa a ser o GitHub Pages, `ftp.proj3ctnebula.pt` passaria a servir o
site — sem sentido nenhum. Apagado.

## Zona final na Cloudflare

| Tipo | Nome | Valor | Proxy |
|---|---|---|---|
| A | `@` | `185.199.108.153` | **DNS only** |
| A | `@` | `185.199.109.153` | **DNS only** |
| A | `@` | `185.199.110.153` | **DNS only** |
| A | `@` | `185.199.111.153` | **DNS only** |
| CNAME | `www` | `danielrovisco.github.io` | **DNS only** |
| MX | `@` | `mail-pt.securemail.pro` (prio 10) | — |
| TXT | `@` | `v=spf1 include:spf.webapps.net ~all` | — |
| SRV | `_autodiscover._tcp` | prio 10, peso 10, porta 443, `ms-pt.securemail.pro` | — |
| CNAME | `autoconfig` | `tb-pt.securemail.pro` | **DNS only** |
| CNAME | `mail` | `mail-pt.securemail.pro` | **DNS only** |
| CNAME | `pim` | `pim-pt.webapps.net` | **DNS only** |
| CNAME | `smtp` | `smtp-pt.securemail.pro` | **DNS only** |
| CNAME | `webmail` | `webmail-pt.setupdns.net` | **DNS only** |

Mais tarde junta-se-lhes `cdn` → bucket público do R2, criado pela própria
Cloudflare quando se liga o domínio ao bucket.

### A importação automática trouxe 3 de 13

Ao adicionar o domínio, a Cloudflare varre a zona antiga e importa o que
encontra. Aqui trouxe só o `MX`, o `SRV` e o `TXT` — faltaram os quatro `A`, o
`www` e os cinco CNAME de email. Os dez tiveram de ser escritos à mão.

Fica registado porque a varredura tem ar de ter corrido bem: não avisa do que
não trouxe, e a lista curta parece uma lista completa. Se um dia for preciso
repetir isto, conferir contra a tabela acima antes de trocar os nameservers —
depois da troca, é esta zona que manda, e o que lhe faltar deixa de existir.

### Tudo em DNS only, sem excepção

A Cloudflare liga o proxy (nuvem laranja) por defeito ao importar. Nestes
registos isso parte duas coisas diferentes:

- **Nos quatro `A` e no `www`:** o GitHub não consegue emitir o certificado
  enquanto o proxy estiver à frente, e o site fica sem HTTPS.
- **No `mail`, `smtp`, `webmail`, `autoconfig`, `pim`:** o proxy da Cloudflare
  só encaminha HTTP e HTTPS. IMAP e SMTP não passam — o email deixa de
  funcionar nos clientes, e a mensagem de erro não aponta para aqui.

## Email

Os `MX` para `securemail.pro` são serviço de email incluído pela Amen no
registo do domínio. Ou seja, a caixa `geral@proj3ctnebula.pt` cria-se no painel
deles — não é preciso Zoho nem nada externo.

Falta um registo **DMARC** (`_dmarc` TXT). Não é urgente e não parte nada, mas
melhora a entrega e evita que alguém envie email em nome do domínio. Fica para
depois de a caixa estar criada.
