# A numeração da mostra, com mais do que um a carregar

O que está aqui não cabe no `casamento.sql`: precisa de várias ligações ao
mesmo tempo, e o `psql` corre uma instrução de cada vez. Ficam o que se mediu e
como se repete.

## O que se corrigiu

**A corrida.** O `mostra_numero` lia o contador e só depois o actualizava. Duas
chamadas ao mesmo tempo liam as duas o mesmo valor e recebiam o mesmo número.
Medido com trinta chamadas em paralelo: **onze números distintos em trinta**.

A linha da mostra passou a ser trancada (`for update`) antes de se decidir
seja o que for. Mesma medição depois: **trinta em trinta**, seguidos, sem
repetições.

**A janela entre entregar e entrar.** Entre receber o número e a linha da
fotografia entrar passam vários segundos — a imagem é reduzida duas vezes e
sobem dois ficheiros. Nesse intervalo o número estava entregue e não estava em
lado nenhum, e uma segunda chamada podia levá-lo também.

Os números entregues passaram a ficar em `print_numeros`, escritos no mesmo
instante em que são entregues. O conflito, quando existe, aparece agora **antes**
de a imagem ser preparada, com uma frase que se percebe, em vez de rebentar no
índice único depois de dois ficheiros já terem subido.

## O que se mediu depois

Duzentos ficheiros, com o cliente a carregar um de cada vez e a demorar entre
30 e 100 ms por ficheiro, como ele faz:

| ao mesmo tempo | ficheiros renomeados 1..200 | sem número no nome | metade e metade |
|---|---|---|---|
| 1 (um portátil) | 200/200 | 200/200 | 200/200 |
| 2 | 200/200 | 200/200 | 200/200 |
| 6 | 200/200 | 200/200 | 200/200 |
| 12 | 200/200 | 200/200 | 200/200 |

A coluna do meio e a da direita passam porque o cliente ordena antes de
carregar (ver `porNome`): os ficheiros numerados vão todos à frente, e os
outros a seguir.

## O que continua a poder falhar, e não é uma corrida

**Dois carregamentos ao mesmo tempo com convenções diferentes.** Um portátil
com a pasta renomeada 1..100 e outro com ficheiros da máquina, sem número, a
carregar em simultâneo para a mesma mostra:

```
    portátil A (1..100 renomeados): 51/100
    portátil B (sem número):        100/100
    números distintos: 151 de 151
    falhas: 49 → "Já existe a fotografia número 2."
```

Os automáticos do B vão buscar os números baixos que o A quer pelo nome. Não é
tranca nenhuma que resolve isto: um número automático não pode adivinhar que um
ficheiro ainda por chegar se chama `2.jpg`.

Repare-se no que **não** acontece: nunca saem dois ficheiros com o mesmo número
(151 distintos em 151). O que falha, falha a recusar, e diz porquê.

**A regra prática é uma só: uma mostra, um carregamento de cada vez.** Se forem
mesmo dois, que usem a mesma convenção — ou os dois renomeiam, ou nenhum.

## Como repetir

Um Postgres local com o esquema aplicado (ver o cabeçalho do `casamento.sql`) e
um script que chame `mostra_numero` em ligações separadas, esperando entre o
número e a inserção para imitar o tempo de preparar e subir a imagem. Foi assim
que os números acima saíram.
