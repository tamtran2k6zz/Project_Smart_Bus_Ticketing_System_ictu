import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { readEnv } from '../config/env';
import { appLogger } from '../config/logger';
import { saveTripLocation, shouldThrottleGpsUpdate } from './gps.service';

const logger = appLogger.child('websocket-gateway');

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  role?: string;
  tripId?: string;
  isAlive?: boolean;
}

const tripRooms = new Map<string, Set<AuthenticatedWebSocket>>();
// Sprint 3 (US 10): user_id → các kết nối của người dùng đó, dùng để push
// thông báo realtime (notifications) tới đúng thiết bị của hành khách.
const userRooms = new Map<string, Set<AuthenticatedWebSocket>>();

/**
 * Push một payload tới mọi kết nối WebSocket của một người dùng.
 * Trả về true nếu có ít nhất một kết nối đang mở nhận được.
 */
export function sendToUser(userId: string, payload: Record<string, unknown>): boolean {
  const room = userRooms.get(userId);
  if (!room || room.size === 0) return false;
  let delivered = false;
  const message = JSON.stringify(payload);
  for (const client of room) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      delivered = true;
    }
  }
  return delivered;
}

export function setupWebSocketGateway(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (token) {
      try {
        const secret = readEnv('JWT_SECRET');
        const decoded = jwt.verify(token, secret) as { id: string; role: string };
        ws.userId = decoded.id;
        ws.role = decoded.role;
      } catch (err) {
        logger.warn('ws_auth_failed', { error: err });
      }
    }

    // Sprint 3: đưa kết nối vào "phòng" của user để nhận thông báo realtime.
    if (ws.userId) {
      let room = userRooms.get(ws.userId);
      if (!room) {
        room = new Set();
        userRooms.set(ws.userId, room);
      }
      room.add(ws);
    }

    ws.on('message', async data => {
      try {
        const message = JSON.parse(data.toString());
        const { action, tripId, latitude, longitude, speed, heading } = message;

        if (action === 'subscribe' && tripId) {
          // Leave previous trip room if any
          if (ws.tripId && ws.tripId !== tripId) {
            const oldRoom = tripRooms.get(ws.tripId);
            if (oldRoom) {
              oldRoom.delete(ws);
              if (oldRoom.size === 0) tripRooms.delete(ws.tripId);
            }
          }

          ws.tripId = tripId;
          if (!tripRooms.has(tripId)) {
            tripRooms.set(tripId, new Set());
          }
          tripRooms.get(tripId)?.add(ws);
          ws.send(JSON.stringify({ status: 'subscribed', tripId }));
          logger.debug('client_subscribed_trip', { tripId, userId: ws.userId });
          return;
        }

        if (action === 'location' && tripId && latitude !== undefined && longitude !== undefined) {
          // Verify driver role for pushing GPS location
          if (ws.role !== 'DRIVER' && ws.role !== 'ADMIN') {
            ws.send(JSON.stringify({ error: 'Unauthorized to push GPS location' }));
            return;
          }

          // Day 14: Throttling & duplicate check
          if (
            ws.userId &&
            shouldThrottleGpsUpdate(ws.userId, Number(latitude), Number(longitude))
          ) {
            return; // Throttled
          }

          // Day 12: Save to Redis/cache
          await saveTripLocation(tripId, {
            latitude: Number(latitude),
            longitude: Number(longitude),
            speed: speed !== undefined ? Number(speed) : undefined,
            heading: heading !== undefined ? Number(heading) : undefined,
          });

          // Broadcast to all subscribers in trip room
          const room = tripRooms.get(tripId);
          if (room) {
            const payload = JSON.stringify({
              event: 'location_update',
              tripId,
              latitude: Number(latitude),
              longitude: Number(longitude),
              speed: speed !== undefined ? Number(speed) : undefined,
              heading: heading !== undefined ? Number(heading) : undefined,
              updatedAt: Date.now(),
            });
            for (const client of room) {
              if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
              }
            }
          }
        }
      } catch (err) {
        logger.error('ws_message_error', { error: err });
      }
    });

    ws.on('close', () => {
      if (ws.tripId) {
        const room = tripRooms.get(ws.tripId);
        if (room) {
          room.delete(ws);
          if (room.size === 0) tripRooms.delete(ws.tripId);
        }
      }
      if (ws.userId) {
        const userRoom = userRooms.get(ws.userId);
        if (userRoom) {
          userRoom.delete(ws);
          if (userRoom.size === 0) userRooms.delete(ws.userId);
        }
      }
    });
  });

  // Heartbeat interval to drop dead connections (fixed: use continue instead of return)
  const interval = setInterval(() => {
    for (const client of wss.clients as Set<AuthenticatedWebSocket>) {
      if (client.isAlive === false) {
        client.terminate();
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  logger.info('websocket_gateway_initialized', { path: '/ws' });
  return wss;
}
