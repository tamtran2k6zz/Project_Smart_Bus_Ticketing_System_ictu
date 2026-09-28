import 'dotenv/config';
import { PrismaClient, RouteStatus, TripStatus } from '@prisma/client';

const prisma = new PrismaClient();

const demoRouteId = '11111111-1111-4111-8111-111111111111';
const originStopId = '22222222-2222-4222-8222-222222222222';
const destinationStopId = '33333333-3333-4333-8333-333333333333';
const demoBusId = '44444444-4444-4444-8444-444444444444';
const demoTripId = '55555555-5555-4555-8555-555555555555';

function getNextUtcDayAtNine(): Date {
  const departureDate = new Date();
  departureDate.setUTCDate(departureDate.getUTCDate() + 1);
  departureDate.setUTCHours(9, 0, 0, 0);
  return departureDate;
}

async function seed() {
  const departureTime = getNextUtcDayAtNine();
  const arrivalTime = new Date(departureTime.getTime() + 2 * 60 * 60 * 1000);

  await prisma.route.upsert({
    where: { id: demoRouteId },
    update: { status: RouteStatus.ACTIVE },
    create: {
      id: demoRouteId,
      code: 'DEMO-ROUTE',
      name: 'Demo Route',
      status: RouteStatus.ACTIVE,
    },
  });

  await prisma.busStop.upsert({
    where: { id: originStopId },
    update: { address: 'Demo Bus Terminal', isActive: true },
    create: {
      id: originStopId,
      code: 'DEMO-ORIGIN',
      name: 'Demo Origin Stop',
      latitude: 21.0285,
      longitude: 105.8542,
    },
  });

  await prisma.busStop.upsert({
    where: { id: destinationStopId },
    update: { address: 'Demo City Center', isActive: true },
    create: {
      id: destinationStopId,
      code: 'DEMO-DESTINATION',
      name: 'Demo Destination Stop',
      latitude: 21.0362,
      longitude: 105.7821,
    },
  });

  await prisma.bus.upsert({
    where: { id: demoBusId },
    update: {},
    create: {
      id: demoBusId,
      plateNumber: 'DEMO-001',
      busType: 'Demo Bus',
      totalSeats: 40,
    },
  });

  await prisma.routeStop.upsert({
    where: { id: '66666666-6666-4666-8666-666666666666' },
    update: { routeId: demoRouteId, stopId: originStopId, stopOrder: 1 },
    create: {
      id: '66666666-6666-4666-8666-666666666666',
      routeId: demoRouteId,
      stopId: originStopId,
      stopOrder: 1,
      estimatedMinutesFromStart: 0,
    },
  });

  await prisma.routeStop.upsert({
    where: { id: '77777777-7777-4777-8777-777777777777' },
    update: { routeId: demoRouteId, stopId: destinationStopId, stopOrder: 2 },
    create: {
      id: '77777777-7777-4777-8777-777777777777',
      routeId: demoRouteId,
      stopId: destinationStopId,
      stopOrder: 2,
      estimatedMinutesFromStart: 90,
    },
  });

  await prisma.trip.upsert({
    where: { id: demoTripId },
    update: { departureTime, arrivalTime, status: TripStatus.SCHEDULED },
    create: {
      id: demoTripId,
      routeId: demoRouteId,
      busId: demoBusId,
      departureTime,
      arrivalTime,
      status: TripStatus.SCHEDULED,
      basePrice: 50000,
    },
  });

  console.log(`Seeded demo trip for ${departureTime.toISOString().slice(0, 10)}.`);
  console.log(`Origin stop ID: ${originStopId}`);
  console.log(`Destination stop ID: ${destinationStopId}`);
}

seed()
  .catch(error => {
    console.error('Failed to seed demo trip data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
