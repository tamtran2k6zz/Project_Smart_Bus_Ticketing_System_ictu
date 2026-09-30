import { useEffect, useState } from 'react';
import SeatMap from '../../components/booking/SeatMap';
import { getTripSeats } from '../../services/ticketingApi';
import type { TripSeatsResponse } from '../../types/seat';

function SeatSelectionDemoPage() {
  const [data, setData] = useState<TripSeatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hashParams = new URLSearchParams(
    window.location.hash.split('?')[1] ?? '',
  );

  const tripId = hashParams.get('tripId');

  useEffect(() => {
    if (!tripId) {
      return;
    }

    let cancelled = false;

    const loadSeats = async () => {
      try {
        setLoading(true);

        const result = await getTripSeats(tripId);

        if (!cancelled) {
          setData(result);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Không thể tải sơ đồ ghế',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSeats();

    const intervalId = window.setInterval(loadSeats, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [tripId]);

  if (!tripId) {
    return (
      <main className="seat-demo-page">
        <div className="seat-map">
          <div className="seat-map-header">
            <div>
              <h2>Sơ đồ ghế xe</h2>
              <p>Chưa có mã chuyến xe để tải dữ liệu.</p>
            </div>
          </div>

          <div className="form-error">
            Vui lòng mở trang với dạng:
            <br />
            <strong>
              http://localhost:5173/#seat-map?tripId=TRIP_ID
            </strong>
          </div>
        </div>
      </main>
    );
  }

  if (loading && !data) {
    return (
      <main className="seat-demo-page">
        <div className="content-card">
          Đang tải sơ đồ ghế...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="seat-demo-page">
        <div className="form-error">
          {error}
        </div>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <main className="seat-demo-page">
      <SeatMap
        seats={data.seats}
        onSelectionChange={(selectedSeatIds: string[]) => {
          console.log('Ghế đang chọn:', selectedSeatIds);
        }}
      />
    </main>
  );
}

export default SeatSelectionDemoPage;