import { useMemo, useState } from 'react';
import type { SeatApi } from '../../types/seat';

type Floor = 'DECK_1' | 'DECK_2';

interface SeatMapProps {
  seats: SeatApi[];
  onSelectionChange?: (selectedSeatIds: string[]) => void;
}

function SeatMap({ seats, onSelectionChange }: SeatMapProps) {
  const [selectedFloor, setSelectedFloor] = useState<Floor>('DECK_1');
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  const floorSeats = useMemo(() => {
    return seats
      .filter((seat) => seat.deck === selectedFloor)
      .sort((a, b) =>
        a.seatNumber.localeCompare(b.seatNumber, undefined, {
          numeric: true,
          sensitivity: 'base',
        }),
      );
  }, [seats, selectedFloor]);

  /**
   * Backend hiện trả seatNumber + deck + rowPosition,
   * chưa trả row/column cụ thể.
   *
   * Tạm thời FE sắp 4 ghế / hàng:
   * [1] [2]   [3] [4]
   *
   * Sau này nếu backend trả layout chính xác thì
   * chỉ cần thay phần mapping này.
   */
  const getSeatPosition = (index: number) => {
    const row = Math.floor(index / 4) + 1;

    const columnMap = [1, 2, 4, 5];

    return {
      row,
      column: columnMap[index % 4],
    };
  };

  const handleSeatClick = (seat: SeatApi) => {
    if (!seat.isAvailable) {
      return;
    }

    setSelectedSeats((current) => {
      const isSelected = current.includes(seat.id);

      const next = isSelected
        ? current.filter((id) => id !== seat.id)
        : [...current, seat.id];

      onSelectionChange?.(next);

      return next;
    });
  };

  const getSeatClassName = (seat: SeatApi) => {
    const isSelected = selectedSeats.includes(seat.id);

    return [
      'seat',
      seat.isAvailable ? 'seat-available' : 'seat-occupied',
      isSelected ? 'seat-selected' : '',
    ]
      .filter(Boolean)
      .join(' ');
  };

  const getSeatStatusLabel = (seat: SeatApi) => {
    if (selectedSeats.includes(seat.id)) {
      return 'Đang chọn';
    }

    return seat.isAvailable ? 'Còn trống' : 'Đã có người đặt';
  };

  return (
    <div className="seat-map">
      <div className="seat-map-header">
        <div>
          <h2>Sơ đồ ghế xe</h2>
          <p>
            Chọn vị trí ghế trên xe
          </p>
        </div>

        <div className="floor-switcher">
          <button
            type="button"
            className={
              selectedFloor === 'DECK_1'
                ? 'floor-button active'
                : 'floor-button'
            }
            onClick={() => setSelectedFloor('DECK_1')}
          >
            Tầng 1
          </button>

          <button
            type="button"
            className={
              selectedFloor === 'DECK_2'
                ? 'floor-button active'
                : 'floor-button'
            }
            onClick={() => setSelectedFloor('DECK_2')}
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
          <span className="legend-seat legend-occupied" />
          <span>Đã có người đặt</span>
        </div>
      </div>

      <div className="bus-layout">
        <div className="bus-front">ĐẦU XE</div>

        {floorSeats.length === 0 ? (
          <div className="empty-seats">
            Chưa có dữ liệu ghế cho tầng này.
          </div>
        ) : (
          <div className="seat-grid">
            {floorSeats.map((seat, index) => {
              const { row, column } = getSeatPosition(index);

              return (
                <button
                  key={seat.id}
                  type="button"
                  className={getSeatClassName(seat)}
                  style={{
                    gridRow: row,
                    gridColumn: column,
                  }}
                  onClick={() => handleSeatClick(seat)}
                  disabled={!seat.isAvailable}
                  title={`${seat.seatNumber} - ${getSeatStatusLabel(seat)}`}
                >
                  <span className="seat-number">
                    {seat.seatNumber}
                  </span>

                  <span className="seat-status-dot" />
                </button>
              );
            })}
          </div>
        )}
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