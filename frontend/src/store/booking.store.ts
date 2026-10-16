import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export interface BookingDraft {
  tripId: string;
  seatIds: string[];
  quantity: number;
  holdId: string;
}
const emptyDraft: BookingDraft = { tripId: '', seatIds: [], quantity: 1, holdId: '' };
function createDraftStore(userId: string) {
  return create<
    BookingDraft & {
      set: (data: Partial<BookingDraft>) => void;
      clear: () => void;
    }
  >()(
    persist(
      set => ({
        ...emptyDraft,
        seatIds: [],
        set,
        clear: () => set({ ...emptyDraft, seatIds: [] }),
      }),
      {
        // Separate keys also prevent different accounts in separate tabs overwriting each other.
        // The old unowned smartbus.booking-draft.v1 is intentionally never restored.
        name: 'smartbus.booking-draft.v2:' + encodeURIComponent(userId),
      }
    )
  );
}
const stores = new Map<string, ReturnType<typeof createDraftStore>>();
export function getBookingDraftStore(userId: string) {
  let store = stores.get(userId);
  if (!store) {
    store = createDraftStore(userId);
    stores.set(userId, store);
  }
  return store;
}
export function useBookingDraft(userId: string) {
  return getBookingDraftStore(userId)();
}
