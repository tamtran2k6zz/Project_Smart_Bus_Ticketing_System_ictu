import { checkGeofencing } from './gps.service';
jest.mock('../config/env', () => ({ describeRedisTarget: () => ({ configured: false }) }));

const stops = [{ id: 'boarding-stop', name: 'Trạm đón', latitude: 0, longitude: 0, sequence: 1 }];
const latitudeAt = (meters: number) => (meters / 6371000) * (180 / Math.PI);

it.each([400, 499, 500])(
  'detects a bus %s meters from its stop within the 500m acceptance radius',
  meters => {
    expect(checkGeofencing(latitudeAt(meters), 0, stops, 500)?.stopId).toBe('boarding-stop');
  }
);
it('does not trigger beyond the 500m acceptance radius', () => {
  expect(checkGeofencing(latitudeAt(501), 0, stops, 500)).toBeNull();
});
