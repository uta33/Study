/* 日付の扱い。すべて端末のローカル時刻で "YYYY-MM-DD" 文字列として扱う */

export function pad(n: number): string {
  return (n < 10 ? "0" : "") + n;
}

export function ymd(d: Date): string {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

export function parse(s: string): Date {
  const p = s.split("-");
  return new Date(+p[0], +p[1] - 1, +p[2]);
}

export function today(now: Date = new Date()): string {
  return ymd(now);
}

export function daysUntil(s: string, now: Date = new Date()): number {
  return Math.round((parse(s).getTime() - parse(today(now)).getTime()) / 86400000);
}

/* 月曜始まりの週の月曜日 */
export function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function addDays(s: string, n: number): string {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

/* 分を "h:mm" に */
export function hm(m: number): string {
  m = Math.round(m);
  return Math.floor(m / 60) + ":" + pad(m % 60);
}

/* "YYYY-MM-DD" を "M/D" に */
export function md(s: string): string {
  const d = parse(s);
  return d.getMonth() + 1 + "/" + d.getDate();
}

export function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return ymd(parse(s)) === s;
}
