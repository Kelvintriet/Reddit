// Region codes based on world map
export const REGION_CODES = {
  // North America
  'Northern America': 'NAM',
  'Central America': 'CAM', 
  'Caribbean': 'CAR',
  
  // South America
  'South America': 'SAM',
  
  // Europe
  'Northern Europe': 'NEU',
  'Western Europe': 'WEU',
  'Southern Europe': 'SEU',
  'Eastern Europe': 'EEU',
  
  // Africa
  'Northern Africa': 'NAF',
  'Western Africa': 'WAF',
  'Middle Africa': 'MAF',
  'Eastern Africa': 'EAF',
  'Southern Africa': 'SAF',
  
  // Asia
  'Western Asia': 'WAS',
  'Central Asia': 'CAS',
  'Eastern Asia': 'EAS',
  'Southern Asia': 'SAS',
  'Southeastern Asia': 'SEA',
  
  // Oceania
  'Australia and New Zealand': 'ANZ',
  'Melanesia': 'MEL',
  'Micronesia': 'MIC',
  'Polynesia': 'POL'
} as const;

export const REGIONS = Object.keys(REGION_CODES) as Array<keyof typeof REGION_CODES>;

export type RegionKey = keyof typeof REGION_CODES;
export type RegionCode = typeof REGION_CODES[RegionKey];

// Helper function to get region code
export const getRegionCode = (region: string): string => {
  return REGION_CODES[region as RegionKey] || 'UNK'; // Unknown region fallback
};

// Helper function to generate random 3-digit number
export const generateRandomNumber = (): string => {
  return Math.floor(100 + Math.random() * 900).toString();
};

// Helper function to generate custom UID
export const generateCustomUID = (userNumbers: string, regionCode: string): string => {
  const randomPart = generateRandomNumber();
  return `${randomPart}-${userNumbers}-${regionCode}`;
};

// Validate user chosen numbers (must be 3 digits)
export const validateUserNumbers = (numbers: string): boolean => {
  return /^\d{3}$/.test(numbers);
};

// Validate @name format (letters, numbers, underscore, 3-20 chars)
export const validateAtName = (name: string): boolean => {
  return /^[a-zA-Z0-9_]{3,20}$/.test(name);
}; 