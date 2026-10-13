import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Stop } from '@/features/operations/types';
import type { LocationUpdate } from '../types';
import s from './Tracking.module.css';

const VIETNAM_STOPS_COORDS: Record<string, [number, number]> = {
  'thái nguyên': [21.58245, 105.83615],
  'bến xe thái nguyên': [21.58245, 105.83615],
  'bắc kạn': [22.14682, 105.83471],
  'bến xe bắc kạn': [22.14682, 105.83471],
  'lạng sơn': [21.84903, 106.75704],
  'bến xe lạng sơn': [21.84903, 106.75704],
  'đại học ictu': [21.5852, 105.8075],
  ictu: [21.5852, 105.8075],
  'công nghệ thông tin': [21.5852, 105.8075],
  'gang thép': [21.5367, 105.8594],
  'bến xe bắc giang': [21.2731, 106.1946],
  'bắc giang': [21.2731, 106.1946],
  'hồ núi cốc': [21.575, 105.716],
  'sông công': [21.491, 105.845],
  'bến xe mỹ đình': [21.02851, 105.77832],
  'mỹ đình': [21.02851, 105.77832],
  'đại học quốc gia hà nội': [21.03682, 105.78253],
  'trạm cầu giấy': [21.02981, 105.80164],
  'cầu giấy': [21.02981, 105.80164],
  'trạm kim mã': [21.03152, 105.81981],
  'kim mã': [21.03152, 105.81981],
  'bến xe long biên': [21.04223, 105.85052],
  'long biên': [21.04223, 105.85052],
  'sân bay quốc tế nội bài': [21.21871, 105.80422],
  'nội bài': [21.21871, 105.80422],
  'bến xe yên nghĩa': [20.9535, 105.7482],
  'yên nghĩa': [20.9535, 105.7482],
  'hà đông': [20.9723, 105.777],
};

function getValidCoordinates(stop: Stop, fallbackIndex = 0): [number, number] {
  const coordinates = stop as Stop & { latitude?: number | string; longitude?: number | string };
  const lat = Number(stop.lat ?? coordinates.latitude);
  const lng = Number(stop.lng ?? coordinates.longitude);
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    const nameLower = (stop.name || '').toLowerCase();
    for (const [key, coords] of Object.entries(VIETNAM_STOPS_COORDS)) {
      if (nameLower.includes(key)) {
        return coords;
      }
    }
    // Tọa độ dự phòng tại Thái Nguyên
    return [21.58245 + fallbackIndex * 0.05, 105.83615 + fallbackIndex * 0.04];
  }
  return [lat, lng];
}

export function MapAdapter({ stops, location }: { stops: Stop[]; location?: LocationUpdate }) {
  const root = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    marker = useRef<L.Marker | null>(null),
    busIcon = useRef<L.DivIcon | null>(null);

  useEffect(() => {
    if (!root.current || !stops.length) return;
    const instance = L.map(root.current, { scrollWheelZoom: false, attributionControl: true });
    map.current = instance;

    // Luôn tải bản đồ OpenStreetMap thật cho mọi môi trường
    const tileUrl =
      import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const tileAttr =
      import.meta.env.VITE_MAP_ATTRIBUTION ||
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    L.tileLayer(tileUrl, {
      attribution: tileAttr,
      maxZoom: 19,
    }).addTo(instance);

    const coords = stops.map((stop, i) => getValidCoordinates(stop, i));
    L.polyline(coords, { color: '#16a34a', weight: 5, opacity: 0.85 }).addTo(instance);

    stops.forEach((stop, i) => {
      const stopCoord = getValidCoordinates(stop, i);
      const popup = document.createElement('span');
      popup.textContent = stop.name;
      L.circleMarker(stopCoord, {
        radius: 7,
        color: '#15803d',
        fillColor: '#ffffff',
        fillOpacity: 1,
        weight: 3,
      })
        .addTo(instance)
        .bindPopup(popup);
    });

    instance.fitBounds(L.latLngBounds(coords), { padding: [45, 45], maxZoom: 14 });

    // Biểu tượng xe buýt thông minh hiện đại với hiệu ứng sóng radar định vị GPS
    const busSvgHtml = `
      <div class="${s.busMarkerWrapper}">
        <div class="${s.busRadarWave}"></div>
        <div class="${s.busBadge}" title="Xe buýt đang hoạt động">
          <svg viewBox="0 0 28 28" width="22" height="22" fill="none">
            <rect x="3.5" y="4" width="21" height="17" rx="3.5" fill="#16a34a" stroke="#ffffff" stroke-width="2"/>
            <path d="M5.5 7h17v5.5h-17z" fill="#dcfce7" stroke="#ffffff" stroke-width="1.2"/>
            <line x1="14" y1="7" x2="14" y2="12.5" stroke="#16a34a" stroke-width="1.2"/>
            <circle cx="7.5" cy="16.5" r="1.5" fill="#fef08a" stroke="#ffffff" stroke-width="0.8"/>
            <circle cx="20.5" cy="16.5" r="1.5" fill="#fef08a" stroke="#ffffff" stroke-width="0.8"/>
            <line x1="11" y1="16.5" x2="17" y2="16.5" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
            <rect x="5.5" y="21" width="3" height="3" rx="1" fill="#1f2937"/>
            <rect x="19.5" y="21" width="3" height="3" rx="1" fill="#1f2937"/>
          </svg>
        </div>
      </div>
    `;

    const icon = L.divIcon({
      className: s.busDivIcon,
      html: busSvgHtml,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    busIcon.current = icon;
    if (location?.lat != null && location.lng != null)
      marker.current = L.marker([location.lat, location.lng], { icon }).addTo(instance);

    const resize = new ResizeObserver(() => instance.invalidateSize());
    resize.observe(root.current);

    return () => {
      resize.disconnect();
      instance.remove();
      map.current = null;
      marker.current = null;
    };
  }, [stops]);

  useEffect(() => {
    if (location?.lat != null && location.lng != null && map.current && busIcon.current) {
      if (!marker.current)
        marker.current = L.marker([location.lat, location.lng], { icon: busIcon.current }).addTo(
          map.current
        );
      else marker.current.setLatLng([location.lat, location.lng]);
    }
  }, [location]);

  return <div ref={root} className={s.map} aria-label="Bản đồ tuyến xe và trạm" />;
}
