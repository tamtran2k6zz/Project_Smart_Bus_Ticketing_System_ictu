import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useBookingDraft = create<{
  tripId: string;
  seatIds: string[];
  quantity: number;
  holdId: string;
  set: (
    data: Partial<{ tripId: string; seatIds: string[]; quantity: number; holdId: string }>
  ) => void;
  clear: () => void;
}>()(
  persist(
    set => ({
      tripId: '',
      seatIds: [],
      quantity: 1,
      holdId: '',
      set,
      clear: () => set({ tripId: '', seatIds: [], quantity: 1, holdId: '' }),
    }),
    { name: 'smartbus.booking-draft.v1' }
  )
);
