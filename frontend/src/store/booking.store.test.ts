import { beforeEach, expect, it } from 'vitest';
import { getBookingDraftStore } from './booking.store';
beforeEach(() => {
  localStorage.clear();
  getBookingDraftStore('A').getState().clear();
  getBookingDraftStore('B').getState().clear();
});
it('never assigns an unowned legacy hold to the next signed-in account', async () => {
  localStorage.setItem(
    'smartbus.booking-draft.v1',
    JSON.stringify({
      state: { tripId: 'trip', holdId: 'somebody-elses-hold', seatIds: ['A01'], quantity: 1 },
      version: 0,
    })
  );
  const store = getBookingDraftStore('B');
  await store.persist.rehydrate();
  expect(store.getState().holdId).toBe('');
  expect(store.getState().seatIds).toEqual([]);
});
it('persists each passenger under a separate key and clears only their own selection', async () => {
  const a = getBookingDraftStore('A'),
    b = getBookingDraftStore('B');
  a.getState().set({ tripId: 'trip', holdId: 'A-hold', seatIds: ['A01'] });
  const savedA = localStorage.getItem('smartbus.booking-draft.v2:A');
  b.getState().set({ tripId: 'trip', holdId: 'B-hold', seatIds: ['A02'] });
  expect(localStorage.getItem('smartbus.booking-draft.v2:A')).toBe(savedA);
  await a.persist.rehydrate();
  await b.persist.rehydrate();
  expect(a.getState().holdId).toBe('A-hold');
  expect(b.getState().holdId).toBe('B-hold');
  b.getState().clear();
  expect(a.getState().holdId).toBe('A-hold');
  expect(localStorage.getItem('smartbus.booking-draft.v2:A')).toBe(savedA);
  expect(b.getState().holdId).toBe('');
});
