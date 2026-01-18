
export const JUSTICE_NAME_MAP: Record<string, string> = {
  // Recent / Current
  "RWagner": "Richard Wagner",
  "BMcLachlin": "Beverley McLachlin",
  "BDickson": "Brian Dickson",
  "ALamer": "Antonio Lamer",
  "SAbella": "Rosalie Silberman Abella",
  "MJMoldaver": "Michael Moldaver",
  "AKarakatsanis": "Andromache Karakatsanis",
  "CGascon": "Clément Gascon",
  "SCote": "Suzanne Côté",
  "SCôté": "Suzanne Côté", // Handle accented variant in raw data
  "RBrown": "Russell Brown",
  "MRowe": "Malcolm Rowe",
  "SMartin": "Sheilah Martin",
  "NKasirer": "Nicholas Kasirer",
  "MJamal": "Mahmud Jamal",
  "mjamal": "Mahmud Jamal", // Handle lowercase variant in raw data
  "Mjamal": "Mahmud Jamal",
  "MOBonsawin": "Michelle O'Bonsawin",
  "MOBonsu": "Michelle O'Bonsawin",
  "MRothstein": "Marshall Rothstein",
  "TCromwell": "Thomas Cromwell",
  "LCharron": "Louise Charron",
  "MFish": "Morris Fish",
  "LDeschamps": "Marie Deschamps",
  "LLeBel": "Louis LeBel",
  "LArbour": "Louise Arbour",
  "WBinnie": "Ian Binnie",
  "MBastarache": "Michel Bastarache",
  "JCMajor": "John C. Major",
  "FIacobucci": "Frank Iacobucci",
  "PCory": "Peter Cory",
  "CDGonthier": "Charles Gonthier",
  "JSopinka": "John Sopinka",
  "JLeDain": "Gérald Le Dain",
  "GLForest": "Gérard La Forest",
  "JChouinard": "Julien Chouinard",
  "WRMcIntyre": "William McIntyre",
  "WZEstey": "Willard Estey",
  "YPratte": "Yves Pratte",
  "JBeetz": "Jean Beetz",
  "LPigeon": "Louis-Philippe Pigeon",
  "WSpence": "Wishart Spence",
  "EMHall": "Emmett Hall",
  "RARitchie": "Roland Ritchie",
  "WJudson": "Wilfred Judson",
  "RMartland": "Ronald Martland",
  "DCAbbott": "Douglas Abbott",
  "JHGFauteux": "Gérald Fauteux",
  "JRCartwright": "John Robert Cartwright",
  "CHLocke": "Charles Locke",
  "JWEstey": "James Wilfred Estey",
  "RLKellock": "Roy Kellock",
  "ICRand": "Ivan Rand",
  "RTaschereau": "Robert Taschereau",
  "PKerwin": "Patrick Kerwin",
  "TCRinfret": "Thibaudeau Rinfret",
  "HGNolan": "Henry Grattan Nolan",
  "HVHudson": "Albert Hudson",
  "ABHudson": "Albert Hudson",
};

export const formatJusticeName = (rawName: string): string => {
  // Check exact map
  if (JUSTICE_NAME_MAP[rawName]) return JUSTICE_NAME_MAP[rawName];

  // Heuristic cleanup if not found
  // e.g. "JSmith" -> "J. Smith"
  // 1. Identify where the Capital letters end and lowercase begins to find the start of Last Name
  // This is imperfect for names like "McIntyre" or "DeGrandpre"
  
  // Regex: Find the transition from Uppercase to Uppercase+Lowercase or just Uppercase+Lowercase
  // Case 1: JHGFauteux -> JHG Fauteux
  // Case 2: RWagner -> R Wagner
  
  // Strategy: 
  // 1. Separate all leading capitals.
  // 2. Keep the last capital attached to the following lowercase letters.
  
  const match = rawName.match(/^([A-Z]+)([A-Z][a-z]+.*)$/);
  if (match) {
    const initials = match[1].split('').join('. ') + '.';
    const lastName = match[2];
    return `${initials} ${lastName}`;
  }

  // Fallback: Just insert space before capitals if simpler pattern failed
  // return rawName.replace(/([A-Z])/g, ' $1').trim();
  
  return rawName;
};
