const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const integer = new Intl.NumberFormat('es-ES');
const dateTime = new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' });

/** Formatea un importe en euros (ej. `1.234,50 €`). */
export function formatCurrency(value: number): string {
  return currency.format(value);
}

/** Formatea un número entero con separador de miles. */
export function formatNumber(value: number): string {
  return integer.format(value);
}

/** Formatea una fecha ISO como fecha y hora corta. */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

/** Fecha de hoy en formato `AAAA-MM-DD` (para nombres de fichero). */
export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
