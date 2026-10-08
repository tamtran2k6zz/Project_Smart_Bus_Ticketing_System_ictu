import { create } from 'zustand';
export const useUi = create<{ menuOpen: boolean; setMenu: (open: boolean) => void }>()(set => ({
  menuOpen: false,
  setMenu: menuOpen => set({ menuOpen }),
}));
