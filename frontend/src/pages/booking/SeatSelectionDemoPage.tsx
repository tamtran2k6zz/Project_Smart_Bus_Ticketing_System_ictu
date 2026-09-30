import SeatMap, { type Seat } from '../../components/booking/SeatMap';

const demoSeats: Seat[] = [
  // Tầng 1
  { id: 'A01', floor: 1, row: 1, column: 1, status: 'available' },
  { id: 'A02', floor: 1, row: 1, column: 2, status: 'available' },
  { id: 'A03', floor: 1, row: 1, column: 4, status: 'sold' },
  { id: 'A04', floor: 1, row: 1, column: 5, status: 'available' },

  { id: 'A05', floor: 1, row: 2, column: 1, status: 'available' },
  { id: 'A06', floor: 1, row: 2, column: 2, status: 'held' },
  { id: 'A07', floor: 1, row: 2, column: 4, status: 'available' },
  { id: 'A08', floor: 1, row: 2, column: 5, status: 'available' },

  { id: 'A09', floor: 1, row: 3, column: 1, status: 'sold' },
  { id: 'A10', floor: 1, row: 3, column: 2, status: 'available' },
  { id: 'A11', floor: 1, row: 3, column: 4, status: 'available' },
  { id: 'A12', floor: 1, row: 3, column: 5, status: 'held' },

  { id: 'A13', floor: 1, row: 4, column: 1, status: 'available' },
  { id: 'A14', floor: 1, row: 4, column: 2, status: 'available' },
  { id: 'A15', floor: 1, row: 4, column: 4, status: 'sold' },
  { id: 'A16', floor: 1, row: 4, column: 5, status: 'available' },

  { id: 'A17', floor: 1, row: 5, column: 1, status: 'available' },
  { id: 'A18', floor: 1, row: 5, column: 2, status: 'available' },
  { id: 'A19', floor: 1, row: 5, column: 4, status: 'available' },
  { id: 'A20', floor: 1, row: 5, column: 5, status: 'sold' },

  // Tầng 2
  { id: 'B01', floor: 2, row: 1, column: 1, status: 'available' },
  { id: 'B02', floor: 2, row: 1, column: 2, status: 'held' },
  { id: 'B03', floor: 2, row: 1, column: 4, status: 'available' },
  { id: 'B04', floor: 2, row: 1, column: 5, status: 'available' },

  { id: 'B05', floor: 2, row: 2, column: 1, status: 'sold' },
  { id: 'B06', floor: 2, row: 2, column: 2, status: 'available' },
  { id: 'B07', floor: 2, row: 2, column: 4, status: 'available' },
  { id: 'B08', floor: 2, row: 2, column: 5, status: 'held' },

  { id: 'B09', floor: 2, row: 3, column: 1, status: 'available' },
  { id: 'B10', floor: 2, row: 3, column: 2, status: 'available' },
  { id: 'B11', floor: 2, row: 3, column: 4, status: 'sold' },
  { id: 'B12', floor: 2, row: 3, column: 5, status: 'available' },

  { id: 'B13', floor: 2, row: 4, column: 1, status: 'available' },
  { id: 'B14', floor: 2, row: 4, column: 2, status: 'available' },
  { id: 'B15', floor: 2, row: 4, column: 4, status: 'available' },
  { id: 'B16', floor: 2, row: 4, column: 5, status: 'sold' },

  { id: 'B17', floor: 2, row: 5, column: 1, status: 'held' },
  { id: 'B18', floor: 2, row: 5, column: 2, status: 'available' },
  { id: 'B19', floor: 2, row: 5, column: 4, status: 'available' },
  { id: 'B20', floor: 2, row: 5, column: 5, status: 'available' },
];

function SeatSelectionDemoPage() {
  return (
    <main className="seat-demo-page">
      <SeatMap
        seats={demoSeats}
        onSelectionChange={(selectedSeatIds) => {
          console.log('Selected seats:', selectedSeatIds);
        }}
      />
    </main>
  );
}

export default SeatSelectionDemoPage;