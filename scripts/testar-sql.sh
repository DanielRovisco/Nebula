#!/usr/bin/env bash
#
# Corre os testes de SQL contra uma base de dados descartável.
#
#   scripts/testar-sql.sh                       # usa a de omissão, local
#   scripts/testar-sql.sh "postgresql://..."    # ou a que se lhe der
#
# NUNCA apontar isto à base de dados de produção: os ficheiros de teste criam e
# apagam galerias, eventos e utilizadores à vontade. A linha abaixo recusa-se a
# correr contra qualquer endereço que não seja local, de propósito.
#
# Porque é que isto existe em vez de um simples `psql -f`: os ficheiros de teste
# escrevem "SIM" ou "NAO" por linha e não fazem o psql falhar quando dá "NAO".
# Postos no CI assim, passavam sempre, e um teste que passa sempre é pior do que
# não haver teste nenhum, porque dá a impressão de haver uma rede por baixo.
set -euo pipefail

DB="${1:-postgresql://postgres:postgres@localhost:5432/postgres}"

case "$DB" in
  *@localhost:*|*@127.0.0.1:*|*host=localhost*|*host=127.0.0.1*) : ;;
  *) echo "Recuso-me a correr testes contra uma base de dados que não é local: $DB" >&2; exit 2 ;;
esac

raiz="$(cd "$(dirname "$0")/.." && pwd)"
cd "$raiz"

echo "── O andaime (o que o Supabase traz de fábrica e aqui não existe)"
psql "$DB" -v ON_ERROR_STOP=1 -q -f supabase/tests/scaffold.sql

echo "── O esquema"
psql "$DB" -v ON_ERROR_STOP=1 -q --single-transaction -f supabase/schema.sql

falhados=0
passados=0
for ficheiro in supabase/tests/casamento.sql supabase/tests/security.sql; do
  echo
  echo "── $ficheiro"
  saida="$(psql "$DB" -v ON_ERROR_STOP=1 -f "$ficheiro")"
  echo "$saida"
  # Sem âncora no fim da linha: um teste que falha costuma dizer porquê a
  # seguir ("NAO ($2a$10$...)"), e com a âncora essas falhas passavam ao lado.
  # Foi o que aconteceu à primeira versão disto, verificado a partir um teste de
  # propósito: dizia que estava tudo bem.
  falhados=$(( falhados + $(printf '%s\n' "$saida" | grep -cE ':[[:space:]]*NAO' || true) ))
  passados=$(( passados + $(printf '%s\n' "$saida" | grep -cE ':[[:space:]]*SIM' || true) ))
done

echo
# Zero testes passados é tão mau como testes falhados: quer dizer que o ficheiro
# correu sem dizer nada, e isso acontece quando se lhe mexe e se parte a saída.
if [ "$passados" -eq 0 ]; then
  echo "Nenhum teste chegou a dar resposta. Alguma coisa está partida na saída dos ficheiros." >&2
  exit 1
fi

echo "$passados passaram, $falhados falharam."
[ "$falhados" -eq 0 ] || exit 1
