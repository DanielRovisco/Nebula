// Synthetic price levels used ONLY to generate demonstration data (is_seed = true).
// They are plausible orders of magnitude, not statistics. Real figures come from ingestion.

/** Default €/m² (sale) by district code. */
export const DISTRICT_BASE: Record<string, number> = {
  "01": 1500, "02": 950, "03": 1400, "04": 850, "05": 850, "06": 1200, "07": 1100, "08": 2600, "09": 750,
  "10": 1500, "11": 2300, "12": 800, "13": 1700, "14": 1050, "15": 1700, "16": 1250, "17": 850, "18": 1050,
  "31": 2200, "40": 1350,
};

/** Overrides by municipality name for the places where the district default would be far off. */
export const MUNICIPALITY_PM2: Record<string, number> = {
  Lisboa: 5900, Cascais: 5100, Oeiras: 4300, Sintra: 2900, Amadora: 3300, Odivelas: 3200, Loures: 3000, Almada: 3000,
  Seixal: 2400, "Vila Franca de Xira": 2100, Mafra: 2800, Sesimbra: 2900, Setúbal: 2500, Barreiro: 2100, Montijo: 2300,
  Palmela: 2100, Alcochete: 2600, Moita: 1900, Porto: 4000, Matosinhos: 3300, "Vila Nova de Gaia": 2800, Maia: 2800,
  Gondomar: 2000, Valongo: 1900, Espinho: 2400, "Póvoa de Varzim": 2600, "Vila do Conde": 2200, Braga: 2300,
  Guimarães: 1900, Aveiro: 2600, Ílhavo: 2100, Coimbra: 2200, Figueira: 2000, "Figueira da Foz": 2000, Leiria: 2000,
  Peniche: 2600, "Caldas da Rainha": 1800, Nazaré: 2400, "Óbidos": 2400, Faro: 3500, Loulé: 4400, Lagos: 4700,
  Portimão: 3200, Albufeira: 3900, Tavira: 3500, Silves: 2700, Olhão: 2900, Lagoa: 3000, "Vila Real de Santo António": 3000,
  Funchal: 3500, "Câmara de Lobos": 2200, Calheta: 1900, "Ponta Delgada": 2300, Évora: 2000, Viseu: 1700,
  Santarém: 1250, Tomar: 1100, Cartaxo: 1100, "Viana do Castelo": 1900, Bragança: 1000, "Castelo Branco": 1000,
  Portalegre: 850, Beja: 1000, Guarda: 800, "Vila Real": 1000, Sines: 1500, "Santiago do Cacém": 1100,
  Mealhada: 1300, Tondela: 900, Ovar: 1600, Santarém_: 1250,
};

/** Municipalities that should receive extra listings (large urban markets). */
export const BIG_MARKETS = new Set([
  "Lisboa", "Porto", "Cascais", "Sintra", "Oeiras", "Amadora", "Loures", "Almada", "Seixal", "Vila Nova de Gaia",
  "Matosinhos", "Braga", "Setúbal", "Faro", "Loulé", "Albufeira", "Lagos", "Portimão", "Coimbra", "Aveiro",
  "Funchal", "Leiria", "Maia", "Guimarães", "Ponta Delgada", "Odivelas", "Mafra", "Barreiro", "Montijo",
]);

export const STREETS = [
  "Rua do Comércio", "Rua 25 de Abril", "Avenida da República", "Rua da Liberdade", "Rua Direita", "Rua das Flores",
  "Avenida dos Combatentes", "Rua Nova", "Travessa do Forno", "Largo da Igreja", "Rua do Mercado", "Avenida do Mar",
  "Rua dos Pescadores", "Rua da Escola", "Rua de São João", "Avenida Central", "Rua do Sol", "Rua dos Plátanos",
  "Rua da Fonte", "Estrada Nacional", "Rua Padre António", "Rua Dom Dinis", "Avenida Infante Santo", "Rua do Castelo",
  "Rua da Alegria", "Praceta dos Cravos", "Rua das Oliveiras", "Rua do Moinho", "Avenida da Boavista", "Rua do Rossio",
];

export const AGENCIES = [
  "Casas do Tejo", "Atlântico Imóveis", "Ponte Nova Mediação", "Solar & Mar", "Praça Nova Imobiliária", "Cais do Sodré Homes",
  "Serra Verde Imóveis", "Luz do Sul", "Douro Prime", "Alfama Realty", "Costa Azul Imóveis", "Terra & Casa",
  "Horizonte Mediação", "Marés Imobiliária",
];
