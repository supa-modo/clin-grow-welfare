import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';

export type MeetingRealtimeEvent = {
  type: 'meeting:updated' | 'meeting:roster' | 'meeting:pool' | 'meeting:loan';
  meetingId: string;
  loanId?: string;
};

function socketBaseUrl() {
  const api = import.meta.env.VITE_API_URL || '/api';
  if (api.startsWith('http')) return api.replace(/\/api\/?$/, '');
  return window.location.origin;
}

export function useMeetingRealtime(
  meetingId: string | undefined,
  handlers: {
    onRoster?: () => void;
    onPool?: () => void;
    onMeeting?: () => void;
    onLoan?: () => void;
  },
) {
  const token = useAuthStore((s) => s.token);
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token || !meetingId) return undefined;

    const socket = io(socketBaseUrl(), {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('meeting:subscribe', meetingId);
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('meeting:event', (event: MeetingRealtimeEvent) => {
      if (event.meetingId !== meetingId) return;
      if (event.type === 'meeting:roster') handlers.onRoster?.();
      if (event.type === 'meeting:pool') handlers.onPool?.();
      if (event.type === 'meeting:loan') handlers.onLoan?.();
      if (event.type === 'meeting:updated') handlers.onMeeting?.();
    });

    return () => {
      socket.emit('meeting:unsubscribe', meetingId);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token, meetingId, handlers.onRoster, handlers.onPool, handlers.onMeeting, handlers.onLoan]);

  return { connected, socket: socketRef.current };
}

export function useMeetingsLiveRefresh(onRefresh: (meetingId: string) => void) {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return undefined;
    const socket = io(socketBaseUrl(), {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socket.on('meetings:live', (payload: { meetingId?: string }) => {
      if (payload.meetingId) onRefresh(payload.meetingId);
    });
    return () => {
      socket.disconnect();
    };
  }, [token, onRefresh]);
}
