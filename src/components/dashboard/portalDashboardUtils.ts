export const chartColors = [
  '#15803d',
  '#0f766e',
  '#0369a1',
  '#7c3aed',
  '#c2410c',
  '#be123c',
  '#64748b',
  '#d97706',
];

export const chartTooltipStyle = {
  borderRadius: 12,
  borderColor: '#e2e8f0',
  fontSize: 12,
  padding: '4px 8px',
  color: '#374151',
};

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function firstNameFromDisplayName(name: string | undefined): string {
  if (!name?.trim()) return 'Team';
  return name.trim().split(/\s+/)[0] ?? 'Team';
}
