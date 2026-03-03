export type Tier = 'free' | 'pro';

export const TIERS = {
  free: {
    postsPerMonth: 3,
    maxLeads: 5,
    hasAutomation: false,
    hasAiFollowUps: false,
    hasSmsAutomation: false,
  },
  pro: {
    postsPerMonth: Infinity,
    maxLeads: Infinity,
    hasAutomation: true,
    hasAiFollowUps: true,
    hasSmsAutomation: true,
  },
} as const;

export const PRO_ENTITLEMENT_ID = 'Vende Mas Pro';
