import { appConfig } from '@/configs/app.config';
export const money = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
export const dateTime = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: appConfig.timezone,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
export const localDay = (value = new Date()) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: appConfig.timezone }).format(value);
export const time = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: appConfig.timezone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
export const errorText = (error: unknown) =>
  error instanceof Error ? error.message : 'Không thể xử lý yêu cầu. Vui lòng thử lại.';
export const remainingSeconds = (expiresAt: string, serverOffset: number, now = Date.now()) =>
  Math.max(0, Math.ceil((Date.parse(expiresAt) - now - serverOffset) / 1000));
export const inputDateTime = (value: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: appConfig.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find(p => p.type === type)?.value;
  return (
    get('year') + '-' + get('month') + '-' + get('day') + 'T' + get('hour') + ':' + get('minute')
  );
};
