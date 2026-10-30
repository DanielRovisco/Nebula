# Camadas de risco

Cada camada (`risk_layers`) tem **fonte, licença e data de referência**, e cada polígono (`risk_features`) tem um nível. A página do imóvel mostra o nível mais alto que cobre o ponto, ou «Fora das zonas mapeadas». Isto **não** significa ausência de risco, só que a camada não tem polígono ali.

O seed inclui uma única camada ilustrativa (`flood_demo`, `is_seed = true`) para ver a interface. Não é oficial e aparece sempre rotulada.

## Fontes abertas candidatas
- **Cheias:** APA, Atlas da Água e ARPSI (Áreas de Risco Potencial Significativo de Inundação), publicadas em dados.gov.pt como shapefile. O catálogo indica a licença como «não especificada»: **confirmar com a APA** antes de publicar.
- **Sismicidade, incêndio, ruído:** sem fonte carregada. Zonamento sísmico do Eurocódigo 8 (por concelho), cartografia de perigosidade de incêndio do ICNF e mapas de ruído municipais são os pontos de partida.

## Como importar uma camada
1. Converter para GeoJSON em WGS 84 (EPSG:4326), por exemplo com GDAL:
   ```bash
   ogr2ogr -f GeoJSON -t_srs EPSG:4326 cheias.geojson ARPSI.shp
   ```
2. Importar, indicando a propriedade do nível e o mapeamento para chaves (`baixo`, `medium`, `high` ou outras com rank):
   ```bash
   pnpm risk:import --file cheias.geojson --code flood_apa --name "Inundação (APA, ARPSI)" --hazard flood \
     --source "APA, ARPSI 2.º ciclo" --source-url https://dados.gov.pt/... --license "CC-BY 4.0" --as-of 2022-12-22 \
     --level-prop RISCO --levels "baixo=low:Baixo:1,medio=medium:Médio:2,alto=high:Elevado:3"
   ```
   Repetir o comando substitui os polígonos da camada. Valores não listados em `--levels` são ignorados e reportados.
3. Os níveis `high`, `medium` e `low` têm cor própria no mapa. Outras chaves usam a cor neutra.
