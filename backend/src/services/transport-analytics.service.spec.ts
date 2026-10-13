import { forecastDemand, DemandTrip } from './transport-analytics.service';
jest.mock('../config/database', () => ({ query: jest.fn() }));
it('uses same-weekday daily totals and converts demand to trips at 80% capacity', () => {
  const rows: DemandTrip[] = ['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05'].map(date => ({
    routeId: 'r',
    route: 'Tuyến',
    date,
    hour: 8,
    capacity: 40,
    passengers: 32,
    tripId: date,
    vehicle: 'bus',
  }));
  expect(forecastDemand(rows, '2026-10-12', 1.5)[0]).toMatchObject({
    expectedPassengers: 48,
    recommendedTrips: 2,
    sampleDays: 4,
    confidence: 'medium',
    method: 'same-weekday-mean',
  });
});
it('does not fabricate demand without historical trips', () =>
  expect(forecastDemand([], '2026-10-12')).toEqual([]));
