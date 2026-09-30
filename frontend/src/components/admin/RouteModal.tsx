import { useEffect, useState } from 'react';
import StationList from './StationList';
import type { BusRoute, RouteStatus, Station } from '../../types/route';

interface RouteModalProps {
  open: boolean;
  mode: 'add' | 'edit';
  route: BusRoute | null;
  onClose: () => void;
  onSave: (route: BusRoute) => void | Promise<void>;
}

function RouteModal({ open, mode, route, onClose, onSave }: RouteModalProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] =
    useState<RouteStatus>('ACTIVE');

  const [stations, setStations] = useState<Station[]>([]);

  const [stationName, setStationName] = useState('');
  const [stationAddress, setStationAddress] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    setError('');
    setStationName('');
    setStationAddress('');

    if (mode === 'edit' && route) {
      setCode(route.code);
      setName(route.name);
      setStatus(route.status);
      setStations(Array.isArray(route.stations) ? [...route.stations] : []);
      return;
    }

    setCode('');
    setName('');
    setStatus('ACTIVE');
    setStations([]);
  }, [open, mode, route]);

  if (!open) {
    return null;
  }

  const handleAddStation = () => {
    if (!stationName.trim()) {
      setError('Vui lòng nhập tên trạm.');
      return;
    }

    if (!stationAddress.trim()) {
      setError('Vui lòng nhập địa chỉ trạm.');
      return;
    }

    const newStation: Station = {
      id: `station-${Date.now()}`,
      name: stationName.trim(),
      address: stationAddress.trim(),
      order: stations.length + 1,
    };

    setStations(current => [...current, newStation]);

    setStationName('');
    setStationAddress('');
    setError('');
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      setError('Vui lòng nhập mã tuyến.');
      return;
    }

    if (!name.trim()) {
      setError('Vui lòng nhập tên tuyến.');
      return;
    }

    if (stations.length === 0) {
      setError('Vui lòng thêm ít nhất một trạm dừng.');
      return;
    }

    setError('');

    const newRoute: BusRoute = {
      id: route?.id ?? `route-${Date.now()}`,
      code: code.trim(),
      name: name.trim(),
      status,
      stations: (Array.isArray(stations) ? stations : []).map((station, index) => ({
        ...station,
        order: index + 1,
      })),
    };

    setSaving(true);
    try {
      await onSave(newRoute);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu tuyến.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="route-modal" onMouseDown={event => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{mode === 'add' ? 'Thêm tuyến' : 'Sửa tuyến'}</h2>

            <p>{mode === 'add' ? 'Tạo tuyến xe buýt mới' : 'Cập nhật thông tin tuyến'}</p>
          </div>

          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="route-code">Mã tuyến</label>

              <input
                id="route-code"
                value={code}
                onChange={event => {
                  setCode(event.target.value);
                  setError('');
                }}
                placeholder="VD: R04"
              />
            </div>

            <div className="form-group">
              <label htmlFor="route-status">Trạng thái</label>

              <select
                id="route-status"
                value={status}
                onChange={event => setStatus(event.target.value as RouteStatus)}
              >
                <option value="ACTIVE">Hoạt động</option>

                <option value="INACTIVE">Tạm dừng</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="route-name">Tên tuyến</label>

            <input
              id="route-name"
              value={name}
              onChange={event => {
                setName(event.target.value);
                setError('');
              }}
              placeholder="VD: Bến xe Mỹ Đình - Long Biên"
            />
          </div>

          <div className="station-section">
            <div className="station-section-header">
              <div>
                <h3>Trạm dừng</h3>

                <p>Kéo thả để thay đổi thứ tự trạm</p>
              </div>

              <span className="station-count">{stations.length} trạm</span>
            </div>

            <div className="add-station-form">
              <input
                value={stationName}
                onChange={event => {
                  setStationName(event.target.value);
                  setError('');
                }}
                placeholder="Tên trạm"
              />

              <input
                value={stationAddress}
                onChange={event => {
                  setStationAddress(event.target.value);
                  setError('');
                }}
                placeholder="Địa chỉ"
              />

              <button
                type="button"
                className="secondary-button"
                onClick={handleAddStation}
                aria-label="Thêm trạm vào tuyến"
              >
                + Thêm trạm
              </button>
            </div>

            {stations.length > 0 ? (
              <StationList stations={stations} onChange={setStations} />
            ) : (
              <div className="empty-stations">Chưa có trạm dừng</div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="cancel-button"
            onClick={onClose}
            disabled={saving}
          >
            Hủy
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Đang lưu...' : mode === 'add'
              ? 'Tạo tuyến'
              : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RouteModal;
