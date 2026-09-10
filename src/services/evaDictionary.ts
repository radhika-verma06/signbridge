/**
 * English → NGT gloss mapping for the Eva 3D avatar's SiGML dictionary.
 *
 * Eva (GTI Performs, served locally from :5070) ships with an NGT sign
 * dictionary (~185 SiGML glosses). This key was curated against her host's
 * own ENGLISH_KEY.json (static/performs/data/ENGLISH_KEY.json) so everyday
 * English words drive her real recorded signs rather than fingerspelling.
 * Anything not in this map fingerspells letter by letter.
 */
export const ENGLISH_TO_EVA_GLOSS: Record<string, string> = {
  body: 'LICHAAM', heart: 'HART', brain: 'HERSENEN', blood: 'BLOED',
  hand: 'HAND', head: 'HOOFD', leg: 'BEEN',
  live: 'LEVEN', grow: 'GROEIEN', bloom: 'BLOEIEN',
  eat: 'ETEN', drink: 'DRINKEN',
  see: 'KIJKEN', look: 'KIJKEN', read: 'LEZEN',
  listen: 'HOREN', hear: 'HOREN',
  think: 'DENKEN', do: 'DOEN',
  go: 'GAAN', come: 'KOMEN',
  help: 'HELPEN', build: 'BOUWEN', bake: 'BAKKEN', cook: 'KOKEN',
  learn: 'LEREN', teach: 'LERAAR', teacher: 'LERAAR', student: 'LEERLING',
  air: 'LUCHT', earth: 'AARDE-AM{WERELD}', tree: 'BOOM', leaf: 'BLAD',
  grass: 'GRAS', wood: 'HOUT', mountain: 'BERG', forest: 'BOS',
  car: 'AUTO', plane: 'VLIEGTUIG', train: 'TREIN',
  computer: 'COMPUTER', internet: 'INTERNET', book: 'BOEK',
  school: 'SCHOOL', class: 'KLAS', lesson: 'LES',
  big: 'GROOT', small: 'KLEIN', high: 'HOOG', low: 'LAAG', short: 'KORT', slow: 'LANGZAAM',
  good: 'GOED', bad: 'BAD', young: 'JONG',
  blue: 'BLAUW', green: 'GROEN', yellow: 'GEEL', color: 'KLEUR',
  how: 'HOE', yes: 'JA',
  '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  '7': '7', '8': '8', '9': '9', '10': '10', '11': '11', '12': '12',
  '100': '100', '1000': '1000',
};
