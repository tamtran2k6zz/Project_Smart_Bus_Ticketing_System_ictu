import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { BusRoute, Station } from '../../types/route';
import { getRoutes } from '../../services/routes';
import { searchTrips, type TripSearchResult } from '../../services/trips';

function getTodayDate() {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 ? `${hours} giờ ${remainingMinutes} phút` : `${remainingMinutes} phút`;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(price);
}

function PassengerHomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [routeId, setRouteId] = useState('');
  const [originId, setOriginId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [departureDate, setDepartureDate] = useState(getTodayDate);
  const [trips, setTrips] = useState<TripSearchResult[]>([]);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    let active = true;
    getRoutes()
      .then(data => {
        if (!active) return;
        const bookableRoutes = data.filter(
          route => route.status === 'ACTIVE' && route.stations.length >= 2,
        );
        setRoutes(bookableRoutes);
        if (bookableRoutes.length > 0) {
          setRouteId(bookableRoutes[0].id);
          setOriginId(bookableRoutes[0].stations[0].id);
          setDestinationId(bookableRoutes[0].stations[1].id);
        }
      })
      .catch(loadError => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Không thể tải danh sách tuyến xe.',
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingRoutes(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedRoute = useMemo(
    () => routes.find(route => route.id === routeId),
    [routeId, routes],
  );
  const originStops = selectedRoute?.stations ?? [];
  const selectedOrigin = originStops.find(stop => stop.id === originId);
  const destinationStops = selectedOrigin
    ? originStops.filter(stop => stop.order > selectedOrigin.order)
    : [];

  const handleRouteChange = (nextRouteId: string) => {
    const nextRoute = routes.find(route => route.id === nextRouteId);
    setRouteId(nextRouteId);
    setOriginId(nextRoute?.stations[0]?.id ?? '');
    setDestinationId(nextRoute?.stations[1]?.id ?? '');
    setTrips([]);
    setHasSearched(false);
    setError(null);
  };

  const handleOriginChange = (nextOriginId: string) => {
    const nextOrigin = originStops.find(stop => stop.id === nextOriginId);
    const nextDestinations = nextOrigin
      ? originStops.filter(stop => stop.order > nextOrigin.order)
      : [];
    setOriginId(nextOriginId);
    setDestinationId(nextDestinations[0]?.id ?? '');
    setTrips([]);
    setHasSearched(false);
    setError(null);
  };

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setHasSearched(true);
    if (!originId || !destinationId || !departureDate) {
      setError('Vui lòng chọn điểm đi, điểm đến và ngày khởi hành.');
      return;
    }

    setIsSearching(true);
    try {
      setTrips(await searchTrips(originId, destinationId, departureDate));
    } catch (searchError) {
      setTrips([]);
      setError(
        searchError instanceof Error
          ? searchError.message
          : 'Không thể tìm chuyến xe. Vui lòng thử lại.',
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const stationName = (stopId: string) =>
    selectedRoute?.stations.find((station: Station) => station.id === stopId)?.name ?? '';

  return (
    <main className="passenger-home">
      <header className="passenger-home-header">
        <a className="passenger-brand" href="/" aria-label="SmartBus trang chủ">
          <span aria-hidden="true">🚌</span>
          <strong>SmartBus ICTU</strong>
        </a>
        <div className="passenger-account">
          <span>Xin chào, {user?.fullName}</span>
          <button type="button" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </header>

      <div className="passenger-page">
        <section className="passenger-intro">
          <span className="passenger-eyebrow">ĐẶT VÉ XE BUÝT TRỰC TUYẾN</span>
          <h1>Chuyến đi tiếp theo của bạn bắt đầu từ đây</h1>
          <p>Tìm tuyến xe phù hợp và xem các chuyến đang mở bán.</p>
        </section>

        <section className="trip-search-panel" aria-labelledby="trip-search-title">
          <h2 id="trip-search-title">Tìm chuyến xe</h2>
          <form className="trip-search-form" onSubmit={handleSearch}>
            <label>
              Tuyến xe
              <select
                value={routeId}
                onChange={event => handleRouteChange(event.target.value)}
                disabled={isLoadingRoutes || routes.length === 0}
                required
              >
                {routes.length === 0 && <option value="">Chưa có tuyến khả dụng</option>}
                {(Array.isArray(routes) ? routes : []).map(route => (
                  <option key={route.id} value={route.id}>
                    {route.code} · {route.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Điểm đón
              <select
                value={originId}
                onChange={event => handleOriginChange(event.target.value)}
                disabled={originStops.length === 0}
                required
              >
                {(Array.isArray(originStops) ? originStops : []).map(stop => (
                  <option key={stop.id} value={stop.id}>
                    {stop.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Điểm đến
              <select
                value={destinationId}
                onChange={event => setDestinationId(event.target.value)}
                disabled={destinationStops.length === 0}
                required
              >
                {(Array.isArray(destinationStops) ? destinationStops : []).map(stop => (
                  <option key={stop.id} value={stop.id}>
                    {stop.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ngày khởi hành
              <input
                type="date"
                value={departureDate}
                min={getTodayDate()}
                onChange={event => setDepartureDate(event.target.value)}
                required
              />
            </label>
            <button
              className="trip-search-button"
              type="submit"
              disabled={isLoadingRoutes || isSearching || routes.length === 0}
            >
              {isSearching ? 'Đang tìm chuyến...' : 'Tìm chuyến'}
            </button>
          </form>
          {isLoadingRoutes && <p className="trip-hint">Đang tải danh sách tuyến...</p>}
          {!isLoadingRoutes && routes.length === 0 && !error && (
            <p className="trip-hint">Hiện chưa có tuyến xe đang hoạt động với đủ điểm dừng.</p>
          )}
        </section>

        {error && (
          <p className="trip-error" role="alert">
            {error}
          </p>
        )}

        {hasSearched && !isSearching && !error && (
          <section className="trip-results" aria-live="polite">
            <div className="trip-results-heading">
              <h2>Kết quả chuyến xe</h2>
              <span>
                {stationName(originId)} → {stationName(destinationId)}
              </span>
            </div>
            {trips.length === 0 ? (
              <div className="trip-empty-state">
                <span aria-hidden="true">🔎</span>
                <p>Không tìm thấy chuyến phù hợp trong ngày đã chọn.</p>
                <small>Hãy thử chọn ngày khác hoặc một tuyến khác.</small>
              </div>
            ) : (
              <div className="trip-result-list">
                {(Array.isArray(trips) ? trips : []).map(trip => (
                  <article className="trip-result-card" key={trip.trip_id}>
                    <div className="trip-result-route">
                      <strong>{trip.route_name}</strong>
                      <span>{trip.bus_type}</span>
                    </div>
                    <div className="trip-result-times">
                      <strong>{formatTime(trip.departure_time_at_origin)}</strong>
                      <span>{formatDuration(trip.duration_minutes)}</span>
                      <strong>{formatTime(trip.arrival_time_at_destination)}</strong>
                    </div>
                    <div className="trip-result-price">
                      <strong>{formatPrice(trip.price)}</strong>
                      <span>{trip.available_seats} chỗ còn trống</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

export default PassengerHomePage;
