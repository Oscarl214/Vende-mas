export type Tier = 'free' | 'pro';

export const TIERS = {
  free: {
    postsPerMonth: 10,
    maxLeads: 20,
    hasAutomation: false,
    hasAiFollowUps: false,
    hasSmsAutomation: false,
    hasFollowUpReminders: false,
  },
  pro: {
    postsPerMonth: Infinity,
    maxLeads: Infinity,
    hasAutomation: true,
    hasAiFollowUps: true,
    hasSmsAutomation: true,
    hasFollowUpReminders: true,
  },
} as const;

export const PRO_ENTITLEMENT_ID = 'Vende Mas Pro';
