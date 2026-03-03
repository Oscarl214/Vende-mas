import { useContext } from 'react';
import {
  SubscriptionContext,
  type SubscriptionContextType,
} from '@/providers/subscription-provider';

export function useSubscription(): SubscriptionContextType {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error(
      'useSubscription must be used within a SubscriptionProvider',
    );
  }
  return context;
}
