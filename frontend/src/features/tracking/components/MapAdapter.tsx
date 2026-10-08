import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Stop } from '@/features/operations/types';
import type { LocationUpdate } from '../types';
import s from './Tracking.module.css';
export function MapAdapter({ stops, location }: { stops: Stop[]; location?: LocationUpdate }) {
  const root = useRef<HTMLDivElement>(null),
    map = useRef<L.Map | null>(null),
    marker = useRef<L.Marker | null>(null);
  useEffect(() => {
    if (!root.current || !stops.length) return;
    const instance = L.map(root.current, { scrollWheelZoom: false, attributionControl: true });
    map.current = instance;
    if (import.meta.env.VITE_MAP_TILE_URL)
      L.tileLayer(import.meta.env.VITE_MAP_TILE_URL, {
        attribution: import.meta.env.VITE_MAP_ATTRIBUTION || 'Map provider',
      }).addTo(instance);
    else
      instance.attributionControl.addAttribution(
        'SmartBus · sơ đồ tuyến minh họa, không phải nền địa lý'
      );
    const coords = stops.map(stop => [stop.lat, stop.lng] as L.LatLngTuple);
    L.polyline(coords, { color: '#15803d', weight: 5 }).addTo(instance);
    stops.forEach(stop => {
      const popup = document.createElement('span');
      popup.textContent = stop.name;
      L.circleMarker([stop.lat, stop.lng], {
        radius: 7,
        color: '#15803d',
        fillColor: 'white',
        fillOpacity: 1,
        weight: 3,
      })
        .addTo(instance)
        .bindPopup(popup);
    });
    instance.fitBounds(L.latLngBounds(coords), { padding: [45, 45], maxZoom: 14 });
    const icon = L.divIcon({
      className: s.busMarker,
      html: '<span aria-label="Xe buýt">🚌</span>',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });
    marker.current = L.marker(coords[0], { icon }).addTo(instance);
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
    if (location) marker.current?.setLatLng([location.lat, location.lng]);
  }, [location, stops]);
  return <div ref={root} className={s.map} aria-label="Bản đồ tuyến xe và trạm" />;
}
