import { useEffect, useRef, useState } from 'react';
import { Button, Message } from '@/components/ui/Ui';
import { request } from '@/services/http';
import { appConfig } from '@/configs/app.config';

export function GpsPublisher({ tripId }: { tripId: string }) {
  const watch = useRef<number | undefined>(undefined),
    last = useRef(0),
    sending = useRef(false);
  const [active, setActive] = useState(false),
    [message, setMessage] = useState('');
  useEffect(
    () => () => {
      if (watch.current !== undefined) navigator.geolocation.clearWatch(watch.current);
    },
    []
  );
  if (appConfig.demo) return null;
  function stop() {
    if (watch.current !== undefined) navigator.geolocation.clearWatch(watch.current);
    watch.current = undefined;
    setActive(false);
  }
  function start() {
    if (!navigator.geolocation) {
      setMessage('Thiết bị không hỗ trợ định vị.');
      return;
    }
    setActive(true);
    setMessage('Đang xin quyền định vị…');
    watch.current = navigator.geolocation.watchPosition(
      async position => {
        if (sending.current || Date.now() - last.current < 3000) return;
        sending.current = true;
        last.current = Date.now();
        try {
          const c = position.coords;
          await request('/trips/' + tripId + '/location', 'POST', {
            latitude: c.latitude,
            longitude: c.longitude,
            ...(c.speed !== null ? { speed: c.speed } : {}),
            ...(c.heading !== null ? { heading: c.heading } : {}),
          });
          setMessage('Đã cập nhật vị trí xe.');
        } catch (error) {
          setMessage(error instanceof Error ? error.message : 'Không gửi được vị trí.');
        } finally {
          sending.current = false;
        }
      },
      error => {
        setMessage(error.message);
        stop();
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );
  }
  return (
    <div>
      <Button variant="secondary" onClick={active ? stop : start}>
        {active ? 'Dừng chia sẻ GPS' : 'Chia sẻ GPS xe'}
      </Button>
      <Message>{message}</Message>
    </div>
  );
}
