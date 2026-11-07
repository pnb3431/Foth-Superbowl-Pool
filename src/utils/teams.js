// NFL teams keyed by ESPN abbreviation. The AFC team goes across the top of
// every grid and the NFC team down the side.

export const TEAMS = {
  BAL: { name: 'Ravens', city: 'Baltimore', conf: 'AFC', primary: '#241773', secondary: '#9E7C0C' },
  BUF: { name: 'Bills', city: 'Buffalo', conf: 'AFC', primary: '#00338D', secondary: '#C60C30' },
  CIN: { name: 'Bengals', city: 'Cincinnati', conf: 'AFC', primary: '#FB4F14', secondary: '#000000' },
  CLE: { name: 'Browns', city: 'Cleveland', conf: 'AFC', primary: '#311D00', secondary: '#FF3C00' },
  DEN: { name: 'Broncos', city: 'Denver', conf: 'AFC', primary: '#FB4F14', secondary: '#002244' },
  HOU: { name: 'Texans', city: 'Houston', conf: 'AFC', primary: '#03202F', secondary: '#A71930' },
  IND: { name: 'Colts', city: 'Indianapolis', conf: 'AFC', primary: '#002C5F', secondary: '#A2AAAD' },
  JAX: { name: 'Jaguars', city: 'Jacksonville', conf: 'AFC', primary: '#006778', secondary: '#D7A22A' },
  KC: { name: 'Chiefs', city: 'Kansas City', conf: 'AFC', primary: '#E31837', secondary: '#FFB81C' },
  LV: { name: 'Raiders', city: 'Las Vegas', conf: 'AFC', primary: '#000000', secondary: '#A5ACAF' },
  LAC: { name: 'Chargers', city: 'Los Angeles', conf: 'AFC', primary: '#0080C6', secondary: '#FFC20E' },
  MIA: { name: 'Dolphins', city: 'Miami', conf: 'AFC', primary: '#008E97', secondary: '#FC4C02' },
  NE: { name: 'Patriots', city: 'New England', conf: 'AFC', primary: '#002244', secondary: '#C60C30' },
  NYJ: { name: 'Jets', city: 'New York', conf: 'AFC', primary: '#125740', secondary: '#FFFFFF' },
  PIT: { name: 'Steelers', city: 'Pittsburgh', conf: 'AFC', primary: '#101820', secondary: '#FFB612' },
  TEN: { name: 'Titans', city: 'Tennessee', conf: 'AFC', primary: '#0C2340', secondary: '#4B92DB' },
  ARI: { name: 'Cardinals', city: 'Arizona', conf: 'NFC', primary: '#97233F', secondary: '#FFB612' },
  ATL: { name: 'Falcons', city: 'Atlanta', conf: 'NFC', primary: '#A71930', secondary: '#000000' },
  CAR: { name: 'Panthers', city: 'Carolina', conf: 'NFC', primary: '#0085CA', secondary: '#101820' },
  CHI: { name: 'Bears', city: 'Chicago', conf: 'NFC', primary: '#0B162A', secondary: '#C83803' },
  DAL: { name: 'Cowboys', city: 'Dallas', conf: 'NFC', primary: '#003594', secondary: '#869397' },
  DET: { name: 'Lions', city: 'Detroit', conf: 'NFC', primary: '#0076B6', secondary: '#B0B7BC' },
  GB: { name: 'Packers', city: 'Green Bay', conf: 'NFC', primary: '#203731', secondary: '#FFB612' },
  LAR: { name: 'Rams', city: 'Los Angeles', conf: 'NFC', primary: '#003594', secondary: '#FFA300' },
  MIN: { name: 'Vikings', city: 'Minnesota', conf: 'NFC', primary: '#4F2683', secondary: '#FFC62F' },
  NO: { name: 'Saints', city: 'New Orleans', conf: 'NFC', primary: '#101820', secondary: '#D3BC8D' },
  NYG: { name: 'Giants', city: 'New York', conf: 'NFC', primary: '#0B2265', secondary: '#A71930' },
  PHI: { name: 'Eagles', city: 'Philadelphia', conf: 'NFC', primary: '#004C54', secondary: '#A5ACAF' },
  SF: { name: '49ers', city: 'San Francisco', conf: 'NFC', primary: '#AA0000', secondary: '#B3995D' },
  SEA: { name: 'Seahawks', city: 'Seattle', conf: 'NFC', primary: '#002244', secondary: '#69BE28' },
  TB: { name: 'Buccaneers', city: 'Tampa Bay', conf: 'NFC', primary: '#D50A0A', secondary: '#FF7900' },
  WSH: { name: 'Commanders', city: 'Washington', conf: 'NFC', primary: '#5A1414', secondary: '#FFB612' }
};

export const teamsInConference = (conf) =>
  Object.entries(TEAMS).filter(([, t]) => t.conf === conf).sort((a, b) => a[1].name.localeCompare(b[1].name));

const PLACEHOLDER = {
  top: { name: 'AFC', city: '', conf: 'AFC', primary: '#C8102E', secondary: '#FFFFFF' },
  side: { name: 'NFC', city: '', conf: 'NFC', primary: '#013369', secondary: '#FFFFFF' }
};

/** Display info for the top (AFC) or side (NFC) team, falling back to the conference name. */
export function teamInfo(abbr, slot) {
  const team = TEAMS[abbr];
  return team ? { abbr, ...team } : { abbr: '', ...PLACEHOLDER[slot] };
}

// Light colors need dark text on top of them.
export function textOn(hex) {
  const n = parseInt((hex || '#000000').replace('#', ''), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? '#0B1220' : '#FFFFFF';
}
