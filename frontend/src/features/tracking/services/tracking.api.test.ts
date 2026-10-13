import { beforeEach, expect, it, vi } from 'vitest';
import { trackingApi } from './tracking.api';
const fake = vi.hoisted(() => ({ service: vi.fn() }));
vi.mock('@/services/adapter', () => fake);
beforeEach(() => fake.service.mockReset());
it('preserves missing GPS instead of inserting fallback coordinates, time or ETA', async () => {
  fake.service.mockResolvedValue({
    lat: null,
    lng: null,
    updatedAt: null,
    connected: false,
    eta: null,
    nextStop: 'Chưa có GPS',
  });
  expect(await trackingApi.location('trip')).toMatchObject({
    lat: null,
    lng: null,
    updatedAt: null,
    connected: false,
    eta: null,
  });
});
it('accepts measured zero coordinates and numeric timestamp', async () => {
  fake.service.mockResolvedValue({
    latitude: 0,
    longitude: 0,
    updatedAt: 1791752400000,
    connected: true,
    eta: 0,
  });
  expect(await trackingApi.location('trip')).toMatchObject({
    lat: 0,
    lng: 0,
    connected: true,
    eta: 0,
  });
});
