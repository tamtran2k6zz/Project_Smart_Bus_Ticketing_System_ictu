import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/features/auth/types';
export const useSession = create<{ user: User | null; setUser: (user: User | null) => void }>()(
  persist(set => ({ user: null, setUser: user => set({ user }) }), { name: 'smartbus.session.v1' })
);
