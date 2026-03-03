import { useContext } from 'react';
import { AuthContext, type AuthContextType } from '@/providers/auth-provider';

export function useSession(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useSession must be used within an AuthProvider');
  }
  return context;
}
