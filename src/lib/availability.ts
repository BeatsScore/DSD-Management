export interface Booking {
  order_id: string;
  order_number: string;
  start_date: string;
  end_date: string;
  status: string;
  quantity: number;
  customer?: { name: string };
}

export function isDateInRange(
  date: Date,
  startDate: string,
  endDate: string
): boolean {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return d >= start && d <= end;
}

export function getProductStatusForDate(
  productCondition: string | null,
  bookings: Booking[],
  date: Date = new Date()
): { status: "verfuegbar" | "gebucht" | "defekt"; booking?: Booking } {
  if (productCondition === "defekt") {
    return { status: "defekt" };
  }
  const activeBooking = bookings.find((b) =>
    isDateInRange(date, b.start_date, b.end_date) && b.status !== "storniert"
  );
  if (activeBooking) {
    return { status: "gebucht", booking: activeBooking };
  }
  return { status: "verfuegbar" };
}

export function getBookingsForDateRange(
  bookings: Booking[],
  start: Date,
  end: Date
): Booking[] {
  return bookings.filter((b) => {
    if (b.status === "storniert") return false;
    const bs = new Date(b.start_date);
    bs.setHours(0, 0, 0, 0);
    const be = new Date(b.end_date);
    be.setHours(23, 59, 59, 999);
    const rs = new Date(start);
    rs.setHours(0, 0, 0, 0);
    const re = new Date(end);
    re.setHours(23, 59, 59, 999);
    return bs <= re && be >= rs;
  });
}

export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("de-CH", { month: "long", year: "numeric" });
}

export function getWeekDays(): string[] {
  return ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
