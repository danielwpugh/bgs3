// ISO 3166-1 regions, resolved locally: no flag service or database columns needed.
const codes = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
const names = new Intl.DisplayNames(['en'], { type: 'region' });
export const COUNTRIES = codes.map(code => ({ code, name: names.of(code) || code }));
const aliases: Record<string, string> = {
  usa: 'US', 'united states of america': 'US', uk: 'GB', 'great britain': 'GB',
  'south korea': 'KR', 'north korea': 'KP', 'czech republic': 'CZ', turkey: 'TR',
  'ivory coast': 'CI', 'cape verde': 'CV', 'east timor': 'TL',
};
const byName = new Map(COUNTRIES.flatMap(country => [
  [country.code.toLowerCase(), country], [country.name.toLowerCase(), country],
] as const));

export function getCountry(extraFields: unknown): { name: string; flag: string } | null {
  if (!extraFields || typeof extraFields !== 'object' || !('country' in extraFields)) return null;
  const value = extraFields.country;
  if (typeof value !== 'string' || !value.trim()) return null;
  const key = value.trim().toLowerCase();
  const country = byName.get(aliases[key]?.toLowerCase() || key);
  if (!country) return { name: value.trim(), flag: '' };
  return {
    name: country.name,
    flag: String.fromCodePoint(...[...country.code].map(char => 0x1f1e6 + char.charCodeAt(0) - 65)),
  };
}

// CSV updates merge JSON so adding country cannot discard links or other metadata.
export function mergeExtraFields(existing: unknown, incoming: Record<string, unknown>) {
  return {
    ...(existing && typeof existing === 'object' && !Array.isArray(existing) ? existing : {}),
    ...incoming,
  };
}
