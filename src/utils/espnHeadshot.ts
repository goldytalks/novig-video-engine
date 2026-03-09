// ESPN headshot URL patterns by sport
// Usage: getEspnHeadshotUrl("Donovan Mitchell", "nba") -> URL or null

const NBA_ID_MAP: Record<string, number> = {
  "donovan mitchell": 3136193,
  "lebron james": 1966,
  "stephen curry": 3975,
  "giannis antetokounmpo": 3032977,
  "nikola jokic": 3112335,
  "kevin durant": 3202,
  "joel embiid": 3059318,
  "jayson tatum": 4065648,
  "luka doncic": 3945274,
  "anthony edwards": 4594268,
  "devin booker": 3136195,
  "damian lillard": 6606,
  "trae young": 4277905,
  "zion williamson": 4395628,
  "ja morant": 4279888,
};

export function getEspnHeadshotUrl(
  playerName: string,
  sport: "nba" | "nfl" | "mlb" = "nba"
): string | null {
  const key = playerName.toLowerCase().trim();
  const id = NBA_ID_MAP[key];
  if (!id) return null;

  const sportMap = { nba: "nba", nfl: "nfl", mlb: "mlb" };
  return `https://a.espncdn.com/i/headshots/${sportMap[sport]}/players/full/${id}.png`;
}
