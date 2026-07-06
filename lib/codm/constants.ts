// lib/codm/constants.ts
// CODM competitive map pool and mode definitions.
// Single source of truth — used by the match builder, OCR route, and
// wherever map names / modes need to be displayed or validated.

export const CODM_MAP_NAMES = [
  // Core competitive pool
  'Hacienda',
  'Coastal',
  'Crossroads Strike',
  'Arsenal',
  'Slums',
  'Skidrow',
  'Summit',
  'Highrise',
  'Rust',
  'Hackney Yard',
  'Pine',
  'Scrapyard',
  'Raid',
  'Terminal',
  'Standoff',
  // Additional maps seen in CODM competitive
  'Cage',
  'Hardhat',
  'Killhouse',
  'Shipment',
  'Nuketown',
  'Firing Range',
  'Dome',
  'Reclaim',
  'Meltdown',
] as const;

export type CodmMapName = (typeof CODM_MAP_NAMES)[number];

export const CODM_MODES = ['Hardpoint', 'Search & Destroy', 'Control'] as const;
export type CodmMode = (typeof CODM_MODES)[number];

export const CODM_REGIONS = ['EU', 'NA', 'APAC', 'MENA', 'LAT', 'Global'] as const;
export type CodmRegion = (typeof CODM_REGIONS)[number];

// Map → modes typically played on it in competitive
// (informational; the builder still lets you pick any mode on any map)
export const MAP_PREFERRED_MODES: Partial<Record<CodmMapName, CodmMode[]>> = {
  Hacienda: ['Hardpoint', 'Search & Destroy', 'Control'],
  Coastal: ['Hardpoint', 'Search & Destroy', 'Control'],
  'Crossroads Strike': ['Hardpoint', 'Search & Destroy'],
  Arsenal: ['Hardpoint', 'Search & Destroy', 'Control'],
  Slums: ['Hardpoint', 'Search & Destroy', 'Control'],
  Highrise: ['Hardpoint', 'Search & Destroy'],
  Terminal: ['Hardpoint', 'Search & Destroy'],
  Standoff: ['Hardpoint', 'Search & Destroy', 'Control'],
};

// Points system (mirrors the Discord bot's point values)
export const POINTS = {
  kill: 10,
  death: -5,
  assist: 5,
  mvp: 50,
  win: 100,
  loss: 0,
} as const;
