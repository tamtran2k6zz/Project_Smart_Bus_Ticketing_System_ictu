import { scheduleSlots } from './schedule.service';
jest.mock('../config/database', () => ({ transaction: jest.fn() }));
const config = {
  from: '2099-01-01',
  to: '2099-01-01',
  startTime: '06:00',
  endTime: '07:00',
  headway: 30,
  duration: 30,
  weekdays: [0, 1, 2, 3, 4, 5, 6],
};
it('generates headway slots using Vietnam time', () =>
  expect(scheduleSlots(config)).toEqual([
    '2098-12-31T23:00:00.000Z',
    '2098-12-31T23:30:00.000Z',
    '2099-01-01T00:00:00.000Z',
  ]));
it('rejects invalid time ranges and unbounded batches', () => {
  expect(() => scheduleSlots({ ...config, endTime: '25:00' })).toThrow();
  expect(() => scheduleSlots({ ...config, to: '2099-03-01' })).toThrow();
});
it('rejects nonexistent calendar dates instead of moving them into another month', () => {
  expect(() => scheduleSlots({ ...config, from: '2099-02-30', to: '2099-02-30' })).toThrow();
});
