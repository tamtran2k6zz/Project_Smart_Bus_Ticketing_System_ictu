import { getCheckInWindow } from './check-in-window';

const trip = {
  departure_time: '2026-10-13T06:30:00+07:00',
  arrival_time: '2026-10-13T08:30:00+07:00',
  status: 'SCHEDULED',
};
const opens = Date.parse('2026-10-13T06:00:00+07:00');
const closes = Date.parse('2026-10-13T10:00:00+07:00');
it('reports the actual next-day opening time in Vietnam, independent of the host timezone', () => {
  const window = getCheckInWindow(trip, Date.parse('2026-10-12T09:41:00+07:00'));
  expect(window).toMatchObject({
    state: 'not_open',
    opensAt: '2026-10-12T23:00:00.000Z',
    closesAt: '2026-10-13T03:00:00.000Z',
  });
  expect(window.message).toContain('06:00 13/10/2026');
  expect(window.message).toContain('10:00 13/10/2026');
});
it.each([
  [opens - 1, 'not_open'],
  [opens, 'open'],
  [closes, 'open'],
  [closes + 1, 'closed'],
] as const)('applies the check-in boundary at %s', (now, state) => {
  expect(getCheckInWindow(trip, now).state).toBe(state);
});
it('interprets ISO offsets as the same instant', () => {
  expect(
    getCheckInWindow(
      { ...trip, departure_time: '2026-10-12T23:30:00Z', arrival_time: '2026-10-13T01:30:00Z' },
      opens
    )
  ).toEqual(getCheckInWindow(trip, opens));
});
it.each(['COMPLETED', 'CANCELLED'])('blocks a %s trip even within the time window', status => {
  expect(getCheckInWindow({ ...trip, status }, opens).state).not.toBe('open');
});
it('fails closed for invalid or reversed schedules', () => {
  expect(getCheckInWindow({ ...trip, departure_time: 'invalid' }, opens).state).toBe('unavailable');
  expect(
    getCheckInWindow({ ...trip, arrival_time: '2026-10-13T05:00:00+07:00' }, opens).state
  ).toBe('unavailable');
});
