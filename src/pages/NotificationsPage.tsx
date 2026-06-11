import { useEffect, useMemo, useState } from 'react';
import { FiBell, FiCheckCircle, FiSettings } from 'react-icons/fi';
import { api } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const channels = ['IN_APP', 'EMAIL', 'SMS'];

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [preferences, setPreferences] = useState<any[]>([]);
  const [status, setStatus] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [notificationRes, preferenceRes] = await Promise.all([
        api.get('/notifications', { params: status === 'ALL' ? {} : { status } }),
        api.get('/notifications/preferences'),
      ]);
      setNotifications(notificationRes.data.notifications ?? []);
      setPreferences(preferenceRes.data.preferences ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [status]);

  const groupedPreferences = useMemo(() => {
    const rows = new Map<string, any[]>();
    preferences.forEach((pref) => {
      const list = rows.get(pref.notificationType) ?? [];
      list.push(pref);
      rows.set(pref.notificationType, list);
    });
    return [...rows.entries()].slice(0, 24);
  }, [preferences]);

  const togglePreference = async (target: any) => {
    setSaving(true);
    setMessage('');
    try {
      const next = preferences.map((pref) =>
        pref.notificationType === target.notificationType && pref.channel === target.channel
          ? { ...pref, isEnabled: !pref.isEnabled }
          : pref,
      );
      setPreferences(next);
      const res = await api.put('/notifications/preferences', {
        preferences: next.map(({ notificationType, channel, isEnabled }) => ({ notificationType, channel, isEnabled })),
      });
      setPreferences(res.data.preferences ?? next);
      setMessage('Notification preferences saved.');
    } catch {
      setMessage('Could not save notification preferences.');
    } finally {
      setSaving(false);
    }
  };

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 py-3  lg:flex-row lg:items-center">
        <div>
          <h1 className="text-lg lg:text-xl font-black text-ink-950">Notification center</h1>
          <p className="text-sm text-ink-500">Meeting, finance, approval, voucher, audit, and year-end updates scoped to your account.</p>
        </div>
        <div className="flex gap-2">
          <Button className="w-full lg:w-auto" size="sm" variant="secondary" onClick={markAllRead} data-testid="notifications-mark-all-read">
            <FiCheckCircle className="h-4 w-4" /> Mark all read
          </Button>
        </div>
      </div>

      {message ? <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800">{message}</div> : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_440px]">
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-ink-100 p-4">
            <div className="flex items-center gap-2">
              <FiBell className="h-4 w-4 text-brand-700" />
              <p className="font-extrabold text-ink-900">Inbox</p>
            </div>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as any)}
              className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-semibold"
              data-testid="notification-status-filter"
            >
              <option value="ALL">All</option>
              <option value="UNREAD">Unread</option>
              <option value="READ">Read</option>
            </select>
          </div>
          <div className="divide-y divide-ink-100">
            {loading ? <p className="p-6 text-sm font-semibold text-ink-500">Loading notifications...</p> : null}
            {!loading && notifications.length === 0 ? <p className="p-8 text-center text-sm font-semibold text-ink-500">No notifications found.</p> : null}
            {notifications.map((item) => (
              <button
                key={item.id}
                className="block w-full p-4 text-left transition hover:bg-ink-50"
                onClick={async () => {
                  await api.patch(`/notifications/${item.id}/read`);
                  await load();
                }}
                data-testid="notification-row"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-ink-900">{item.title}</p>
                    <p className="mt-1 text-sm text-ink-600">{item.body}</p>
                    <p className="mt-2 text-xs font-semibold text-ink-400">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                  <Badge tone={item.status === 'UNREAD' ? 'warning' : 'neutral'}>{item.status}</Badge>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* <Card className="p-0">
          <div className="flex items-center gap-2 border-b border-ink-100 p-4">
            <FiSettings className="h-4 w-4 text-brand-700" />
            <p className="font-extrabold text-ink-900">Preferences</p>
            {saving ? <span className="text-xs font-semibold text-ink-500">Saving...</span> : null}
          </div>
          <div className="max-h-[680px] divide-y divide-ink-100 overflow-y-auto">
            {groupedPreferences.map(([type, prefs]) => (
              <div key={type} className="p-4">
                <p className="text-xs font-extrabold uppercase tracking-wide text-ink-500">{type.replaceAll('_', ' ')}</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {channels.map((channel) => {
                    const pref = prefs.find((row) => row.channel === channel) ?? { notificationType: type, channel, isEnabled: true };
                    return (
                      <button
                        type="button"
                        key={channel}
                        onClick={() => togglePreference(pref)}
                        className={`rounded-xl border px-3 py-2 text-xs font-extrabold transition ${
                          pref.isEnabled ? 'border-brand-200 bg-brand-50 text-brand-800' : 'border-ink-200 bg-white text-ink-500'
                        }`}
                        data-testid={`pref-${type}-${channel}`}
                      >
                        {channel}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card> */}
      </div>
    </div>
  );
}
