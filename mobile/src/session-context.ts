import { createContext } from 'react';

import type { UserProfile } from './api';

export type SessionContextValue = {
  token: string;
  user: UserProfile;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const SessionContext = createContext<SessionContextValue | null>(null);
