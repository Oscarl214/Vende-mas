import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@vendemas:';
const ONBOARDING_SEEN_KEY = `${PREFIX}onboarding_seen`;

const MILESTONE_KEYS = [
  'first_post_created',
  'first_post_shared',
  'first_lead',
  'first_booking_closed',
] as const;

export type MilestoneKey = (typeof MILESTONE_KEYS)[number];

function milestoneStorageKey(key: MilestoneKey) {
  return `${PREFIX}milestone_${key}`;
}

export async function hasSeenOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
  return value === 'true';
}

export async function markOnboardingSeen(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
}

export async function markMilestone(key: MilestoneKey): Promise<void> {
  await AsyncStorage.setItem(milestoneStorageKey(key), 'true');
}

export type GrowthChecklist = Record<MilestoneKey, boolean>;

export async function getGrowthChecklist(): Promise<GrowthChecklist> {
  const keys = MILESTONE_KEYS.map(milestoneStorageKey);
  const values = await AsyncStorage.multiGet(keys);

  const checklist = {} as GrowthChecklist;
  MILESTONE_KEYS.forEach((key, i) => {
    checklist[key] = values[i][1] === 'true';
  });
  return checklist;
}

export function isChecklistComplete(checklist: GrowthChecklist): boolean {
  return MILESTONE_KEYS.every((key) => checklist[key]);
}
