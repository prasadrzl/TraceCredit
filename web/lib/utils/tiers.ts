export type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

export const TIER_COLOURS: Record<Tier, string> = {
  Bronze: '#b45309',
  Silver: '#64748b',
  Gold: '#d97706',
  Platinum: '#4f46e5',
  Diamond: '#7c3aed',
};

export const TIER_BG_CLASSES: Record<Tier, string> = {
  Bronze: 'bg-amber-700 text-white',
  Silver: 'bg-slate-500 text-white',
  Gold: 'bg-amber-500 text-white',
  Platinum: 'bg-indigo-600 text-white',
  Diamond: 'bg-violet-600 text-white',
};

export const TIER_RANGES: Record<Tier, [number, number]> = {
  Bronze: [0, 200],
  Silver: [201, 400],
  Gold: [401, 600],
  Platinum: [601, 800],
  Diamond: [801, 1000],
};

export const TIER_CREDIT_LIMITS: Record<Tier, string> = {
  Bronze: '0',
  Silver: '500000000',
  Gold: '5000000000',
  Platinum: '25000000000',
  Diamond: '100000000000',
};

export const TIER_INTEREST_RATES: Record<Tier, number> = {
  Bronze: 0,
  Silver: 1800,
  Gold: 1400,
  Platinum: 1000,
  Diamond: 700,
};

export function scoreToTier(score: number): Tier {
  if (score >= 801) return 'Diamond';
  if (score >= 601) return 'Platinum';
  if (score >= 401) return 'Gold';
  if (score >= 201) return 'Silver';
  return 'Bronze';
}

export function nextTier(tier: Tier): Tier | null {
  const tiers: Tier[] = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
  const idx = tiers.indexOf(tier);
  return idx < tiers.length - 1 ? tiers[idx + 1] : null;
}

export function pointsToNextTier(score: number): number {
  const tier = scoreToTier(score);
  const next = nextTier(tier);
  if (!next) return 0;
  return TIER_RANGES[next][0] - score;
}
