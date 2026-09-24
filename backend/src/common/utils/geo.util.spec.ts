import { calculateDistanceMeters, MIN_BUS_STOP_DISTANCE_METERS } from './geo.util';

describe('GeoUtil', () => {
  it('should return 0 meters for identical coordinates', () => {
    const distance = calculateDistanceMeters(21.5932, 105.8456, 21.5932, 105.8456);
    expect(distance).toBe(0);
  });

  it('should correctly calculate distance for points less than 10 meters apart', () => {
    // 0.00005 degrees latitude is approx 5.5 meters
    const distance = calculateDistanceMeters(21.5932, 105.8456, 21.59325, 105.8456);
    expect(distance).toBeLessThan(MIN_BUS_STOP_DISTANCE_METERS);
  });

  it('should correctly calculate distance for points further than 10 meters apart', () => {
    // Distance between Hanoi (21.0285, 105.8542) and Thai Nguyen (21.5932, 105.8456) is ~60km
    const distance = calculateDistanceMeters(21.0285, 105.8542, 21.5932, 105.8456);
    expect(distance).toBeGreaterThan(50000);
  });
});
