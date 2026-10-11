import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Stop, Route } from '@/features/operations/types';
import type { FleetBusStatus } from '../types';

interface FleetMapAdapterProps {
  stops: Stop[];
  routes: Route[];
  buses: FleetBusStatus[];
  selectedBusId?: string;
  onSelectBus: (bus: FleetBusStatus) => void;
}

export function FleetMapAdapter({
  stops,
  routes,
  buses,
  selectedBusId,
  onSelectBus,
}: FleetMapAdapterProps) {
  const root = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const busMarkers = useRef<Map<string, L.Marker>>(new Map());

  const ROUTE_COLORS: Record<string, string> = {
    r1: '#15803d', // Green (Route 01 - ICTU)
    r2: '#2563eb', // Blue (Route 02 - Nui Coc)
    r3: '#d97706', // Amber (Route 03 - Song Cong)
  };

  const getStatusColor = (status: FleetBusStatus['status']) => {
    switch (status) {
      case 'running':
        return '#22c55e'; // Green
      case 'stopped':
        return '#3b82f6'; // Blue
      case 'standby':
        return '#f59e0b'; // Amber
      case 'incident':
        return '#ef4444'; // Red
      case 'offline':
      default:
        return '#94a3b8'; // Gray
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!root.current || !stops.length) return;

    const instance = L.map(root.current, {
      scrollWheelZoom: true,
      attributionControl: true,
      zoomControl: true,
    });
    map.current = instance;

    if (import.meta.env.VITE_MAP_TILE_URL) {
      L.tileLayer(import.meta.env.VITE_MAP_TILE_URL, {
        attribution: import.meta.env.VITE_MAP_ATTRIBUTION || 'OpenStreetMap',
      }).addTo(instance);
    } else {
      // Free OpenStreetMap tiles for rich geographical visualization
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors · SmartBus Live Fleet Tracking',
        maxZoom: 18,
      }).addTo(instance);
    }

    // Draw route lines
    routes.forEach(route => {
      const color = ROUTE_COLORS[route.id] || '#15803d';
      const routeStops = route.stopIds
        .map(id => stops.find(s => s.id === id))
        .filter((s): s is Stop => !!s);

      if (routeStops.length >= 2) {
        const coords = routeStops.map(s => [s.lat, s.lng] as L.LatLngTuple);
        L.polyline(coords, {
          color,
          weight: 4,
          opacity: 0.75,
          dashArray: route.id === 'r2' ? '6, 6' : undefined,
        })
          .addTo(instance)
          .bindTooltip(`Tuyến ${route.code}: ${route.name}`, { sticky: true });
      }
    });

    // Draw Bus Stops
    stops.forEach(stop => {
      const popup = document.createElement('div');
      popup.style.padding = '4px';
      popup.innerHTML = `
        <strong style="color: #15803d; font-size: 13px;">🚏 ${stop.name}</strong>
        <p style="margin: 4px 0 0; font-size: 11px; color: #64748b;">${stop.address}</p>
      `;

      L.circleMarker([stop.lat, stop.lng], {
        radius: 8,
        color: '#15803d',
        fillColor: '#ffffff',
        fillOpacity: 1,
        weight: 3,
      })
        .addTo(instance)
        .bindPopup(popup)
        .bindTooltip(stop.name, { direction: 'top', offset: [0, -8] });
    });

    // Fit map bounds to encompass all stops
    const allCoords = stops.map(s => [s.lat, s.lng] as L.LatLngTuple);
    if (allCoords.length > 0) {
      instance.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50], maxZoom: 14 });
    }

    const resize = new ResizeObserver(() => instance.invalidateSize());
    resize.observe(root.current);

    return () => {
      resize.disconnect();
      instance.remove();
      map.current = null;
      busMarkers.current.clear();
    };
  }, [stops, routes]);

  // Update Bus Markers whenever buses list updates
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;

    buses.forEach(bus => {
      const statusColor = getStatusColor(bus.status);
      const isSelected = bus.vehicleId === selectedBusId;

      const markerHtml = `
        <div style="
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
        ">
          <!-- Plate number badge -->
          <div style="
            background: #0f172a;
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            padding: 1px 5px;
            border-radius: 4px;
            white-space: nowrap;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            border: 1px solid ${isSelected ? '#38bdf8' : statusColor};
            margin-bottom: 2px;
          ">
            ${bus.plate}
          </div>

          <!-- Bus Icon circle with pulse and status halo -->
          <div style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: ${statusColor};
            border: 2px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            transform: scale(${isSelected ? 1.25 : 1});
            transition: transform 0.2s ease;
          ">
            🚌
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'smartbus-fleet-marker',
        html: markerHtml,
        iconSize: [60, 52],
        iconAnchor: [30, 48],
      });

      let marker = busMarkers.current.get(bus.vehicleId);
      if (!marker) {
        marker = L.marker([bus.lat, bus.lng], { icon })
          .addTo(instance)
          .on('click', () => onSelectBus(bus));
        busMarkers.current.set(bus.vehicleId, marker);
      } else {
        marker.setLatLng([bus.lat, bus.lng]);
        marker.setIcon(icon);
      }
    });

    // Clean up markers of removed vehicles
    const currentVehicleIds = new Set(buses.map(b => b.vehicleId));
    busMarkers.current.forEach((marker, id) => {
      if (!currentVehicleIds.has(id)) {
        marker.remove();
        busMarkers.current.delete(id);
      }
    });
  }, [buses, selectedBusId, onSelectBus]);

  // Center on selected bus
  useEffect(() => {
    if (!selectedBusId || !map.current) return;
    const selected = buses.find(b => b.vehicleId === selectedBusId);
    if (selected) {
      map.current.flyTo([selected.lat, selected.lng], 15, {
        animate: true,
        duration: 0.8,
      });
    }
  }, [selectedBusId, buses]);

  return (
    <div
      ref={root}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 460,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      }}
      aria-label="Bản đồ giám sát toàn bộ xe buýt"
    />
  );
}
