// Backend timestamps come back naive (no timezone suffix) — treat as UTC before converting to IST.
export const toIstDate = (iso: string): Date => {
    const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
    return new Date(hasTz ? iso : `${iso}Z`);
};

export const formatIstDateTime = (iso?: string | null): string => {
    if (!iso) return '';
    const d = toIstDate(iso);
    if (isNaN(d.getTime())) return '';
    const day = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit' });
    const month = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short' });
    const year = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric' });
    const time = d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
    return `${day}${month}.${year}, ${time}`;
};

export const formatIstTime = (iso?: string | null): string => {
    if (!iso) return '';
    const d = toIstDate(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
};

export const formatIstDayLabel = (d: Date): string =>
    d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });

// 'YYYY-MM-DD' key for a UTC instant's IST calendar date — for date-input/comparison use.
export const istDateKey = (d: Date): string => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

// UTC instant of IST midnight for the given IST calendar date key ('YYYY-MM-DD').
export const istDayStartUtc = (dateKey: string): Date => new Date(`${dateKey}T00:00:00+05:30`);
