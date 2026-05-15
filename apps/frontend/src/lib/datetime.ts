export function formatDateByTimezone(
  value: Date | string,
  timezone: string,
  locale = 'vi-VN',
  options?: Intl.DateTimeFormatOptions,
) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  }).format(date);
}

export function formatTimeByTimezone(
  value: Date | string,
  timezone: string,
  locale = 'vi-VN',
  options?: Intl.DateTimeFormatOptions,
) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
  }).format(date);
}

export function formatDateTimeByTimezone(
  value: Date | string,
  timezone: string,
  locale = 'vi-VN',
  options?: Intl.DateTimeFormatOptions,
) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
  }).format(date);
}

export function formatSlotRangeFromOffset(
  baseDate: Date | string,
  startHour: number,
  endHour: number,
  timezone: string,
  locale = 'vi-VN',
  sourceOffset = '+07:00',
) {
  const date = baseDate instanceof Date ? baseDate : new Date(baseDate);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const start = `${y}-${m}-${d}T${String(startHour).padStart(2, '0')}:00:00${sourceOffset}`;

  const endDate = new Date(date);
  if (endHour === 24) {
    endDate.setDate(endDate.getDate() + 1);
  }
  const ey = endDate.getFullYear();
  const em = String(endDate.getMonth() + 1).padStart(2, '0');
  const ed = String(endDate.getDate()).padStart(2, '0');
  const safeEndHour = endHour === 24 ? 0 : endHour;
  const end = `${ey}-${em}-${ed}T${String(safeEndHour).padStart(2, '0')}:00:00${sourceOffset}`;

  return `${formatTimeByTimezone(start, timezone, locale)} - ${formatTimeByTimezone(end, timezone, locale)}`;
}
