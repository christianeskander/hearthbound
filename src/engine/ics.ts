// A calendar file with one daily recurring reminder. This is the fallback that works
// everywhere (iPhone Calendar, Google Calendar, Outlook), because the phone's own
// calendar fires the alarm even when Hearthbound is closed.
const pad = (n: number) => String(n).padStart(2, '0');
const esc = (t: string) => t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 octets are folded (RFC 5545 3.1). */
function fold(line: string): string {
  const out: string[] = [];
  let cur = '';
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > 75) { out.push(cur); cur = ' ' + ch; } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n');
}

export interface IcsInput { time: string; url: string; name: string; start: Date; uid: string; now?: Date; }

export function buildIcs({ time, url, name, start, uid, now = new Date() }: IcsInput): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) throw new Error('Pick a time.');
  const hh = Number(m[1]), mm = Number(m[2]);
  if (hh > 23 || mm > 59) throw new Error('Pick a time.');
  const d = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}`;
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hearthbound//Daily reminder//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    // floating local time: the alarm follows the phone's own time zone
    `DTSTART:${d}T${pad(hh)}${pad(mm)}00`,
    'DURATION:PT10M',
    'RRULE:FREQ=DAILY',
    `SUMMARY:${esc(`Hearthbound: ${name}'s dailies`)}`,
    `DESCRIPTION:${esc(`Your dailies are waiting by the fire. One small thing, then the next.\nOpen Hearthbound: ${url}`)}`,
    `URL:${url}`,
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc('Hearthbound: your dailies are waiting')}`, 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}
