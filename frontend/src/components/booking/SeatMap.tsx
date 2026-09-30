import { useMemo, useState } from 'react';

type Floor = 1 | 2;

export type SeatStatus = 'available' | 'held' | 'sold';

export interface Seat {
  id: string;
  floor: Floor;
  row: number;
  column: number;
  status: SeatStatus;
}

interface SeatMapProps {
  seats: Seat[];
  onSelectionChange?: (selectedSeatIds: string[]) => void;
}

const getStatusLabel = (status: SeatStatus) => {
  switch (status) {
    case 'available':
      return 'Còn trống';
    case 'held':
      return 'Đang giữ';
    case 'sold':
      return 'Đã bán';
  }
};

function SeatMap({ seats, onSelectionChange }: SeatMapProps) {
  const [selectedFloor, setSelectedFloor] = useState<Floor>(1);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  const floorSeats = useMemo(
    () => seats.filter((seat) => seat.floor === selectedFloor),
    [seats, selectedFloor],
  );

  const handleSeatClick = (seat: Seat) => {
    if (seat.status !== 'available') {
      return;
    }

    setSelectedSeats((current) => {
      const alreadySelected = current.includes(seat.id);

      const next = alreadySelected
        ? current.filter((id) => id !== seat.id)
        : [...current, seat.id];

      onSelectionChange?.(next);

      return next;
    });
  };

  const getSeatClassName = (seat: Seat) => {
    const isSelected = selectedSeats.includes(seat.id);

    return [
      'seat',
      `seat-${seat.status}`,
      isSelected ? 'seat-selected' : '',
    ]
      .filter(Boolean)
      .join(' ');
  };

  return (
    <div className="seat-map">
      <div className="seat-map-header">
        <div>
          <h2>Sơ đồ ghế xe</h2>
          <p>Chọn vị trí ghế trên xe</p>
        </div>

        <div className="floor-switcher">
          <button
            type="button"
            className={selectedFloor === 1 ? 'floor-button active' : 'floor-button'}
            onClick={() => setSelectedFloor(1)}
          >
            Tầng 1
          </button>

          <button
            type="button"
            className={selectedFloor === 2 ? 'floor-button active' : 'floor-button'}
            onClick={() => setSelectedFloor(2)}
          >
            Tầng 2
          </button>
        </div>
      </div>

      <div className="seat-legend">
        <div className="legend-item">
          <span className="legend-seat legend-available" />
          <span>Còn trống</span>
        </div>

        <div className="legend-item">
          <span className="legend-seat legend-selected" />
          <span>Đang chọn</span>
        </div>

        <div className="legend-item">
          <span className="legend-seat legend-held" />
          <span>Đang giữ</span>
        </div>

        <div className="legend-item">
          <span className="legend-seat legend-sold" />
          <span>Đã bán</span>
        </div>
      </div>

      <div className="bus-layout">
        <div className="bus-front">ĐẦU XE</div>

        <div className="seat-grid">
          {floorSeats.map((seat) => (
            <button
              key={seat.id}
              type="button"
              className={getSeatClassName(seat)}
              style={{ gridRow: seat.row, gridColumn: seat.column }}
              onClick={() => handleSeatClick(seat)}
              disabled={seat.status !== 'available'}
              title={`${seat.id} - ${getStatusLabel(seat.status)}`}
            >
              <span className="seat-number">{seat.id}</span>
              <span className="seat-status-dot" />
            </button>
          ))}
        </div>
      </div>

      <div className="selected-seat-box">
        <strong>Ghế đang chọn:</strong>{' '}
        {selectedSeats.length > 0
          ? selectedSeats.join(', ')
          : 'Chưa chọn ghế'}
      </div>
    </div>
  );
}

export default SeatMap;