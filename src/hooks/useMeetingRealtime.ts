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
  const handlersRef = useRef(handlers);
  const pendingEventsRef = useRef(new Set<MeetingRealtimeEvent['type']>());
  const flushTimerRef = useRef<number | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

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

    const flushPendingEvents = () => {
      flushTimerRef.current = null;
      const pending = pendingEventsRef.current;
      pendingEventsRef.current = new Set();
      const currentHandlers = handlersRef.current;
      if (pending.has('meeting:updated')) currentHandlers.onMeeting?.();
      if (pending.has('meeting:loan')) currentHandlers.onLoan?.();
      if (pending.has('meeting:roster')) currentHandlers.onRoster?.();
      else if (pending.has('meeting:pool')) currentHandlers.onPool?.();
    };

    socket.on('meeting:event', (event: MeetingRealtimeEvent) => {
      if (event.meetingId !== meetingId) return;
      pendingEventsRef.current.add(event.type);
      if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = window.setTimeout(flushPendingEvents, 120);
    });

    return () => {
      if (flushTimerRef.current) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      socket.emit('meeting:unsubscribe', meetingId);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token, meetingId]);

  return { connected, socket: socketRef.current };
}

export function useMeetingsLiveRefresh(onRefresh: (meetingId: string) => void) {
  const token = useAuthStore((s) => s.token);
  const refreshRef = useRef(onRefresh);
  const pendingRef = useRef(new Set<string>());
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!token) return undefined;
    const socket = io(socketBaseUrl(), {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socket.on('meetings:live', (payload: { meetingId?: string }) => {
      if (!payload.meetingId) return;
      pendingRef.current.add(payload.meetingId);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        const ids = [...pendingRef.current];
        pendingRef.current = new Set();
        timerRef.current = null;
        ids.forEach((id) => refreshRef.current(id));
      }, 200);
    });
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      socket.disconnect();
    };
  }, [token]);
}
