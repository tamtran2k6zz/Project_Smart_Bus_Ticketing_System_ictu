import { query } from '../config/database';
import { readTripLocation } from './tracking-read.service';
jest.mock('../config/database', () => ({ query: jest.fn() }));
const db = query as jest.Mock;
beforeEach(() => db.mockReset());
it('does not invent a GPS position or timestamp when no device has published', async () => {
  db.mockResolvedValueOnce([{ id: 'trip' }]).mockResolvedValueOnce([]);
  expect(await readTripLocation('trip')).toMatchObject({
    lat: null,
    lng: null,
    updatedAt: null,
    connected: false,
    eta: null,
  });
});
it('retains measured coordinates but suspends ETA for stale GPS', async () => {
  db.mockResolvedValueOnce([{ id: 'trip' }]).mockResolvedValueOnce([
    { latitude: 0, longitude: 0, updated_at: new Date(Date.now() - 180000), speed: 5 },
  ]);
  expect(await readTripLocation('trip')).toMatchObject({
    lat: 0,
    lng: 0,
    connected: false,
    eta: null,
  });
});
