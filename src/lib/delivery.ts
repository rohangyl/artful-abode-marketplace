const DELIVERY_BUSINESS_DAYS = 7;

function dateInIndia(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((value) => value.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  if (!year || !month || !day) throw new Error("Could not determine the current date in India.");
  return `${year}-${month}-${day}`;
}

export function estimateDeliveryDate(referenceDate = new Date()): string {
  const date = new Date(`${dateInIndia(referenceDate)}T00:00:00.000Z`);
  let businessDaysAdded = 0;

  while (businessDaysAdded < DELIVERY_BUSINESS_DAYS) {
    date.setUTCDate(date.getUTCDate() + 1);
    const weekday = date.getUTCDay();
    if (weekday !== 0 && weekday !== 6) businessDaysAdded += 1;
  }

  return date.toISOString().slice(0, 10);
}

export function formatDeliveryDate(date: string | null): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00+05:30`);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(parsed);
}
