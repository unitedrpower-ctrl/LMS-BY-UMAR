export interface IqamaStatusResult {
  daysLeft: number | null;
  status: 'EXPIRED' | 'URGENT' | 'WARNING' | 'NOTICE' | 'OK' | 'UNKNOWN';
  badgeClass: string;
  label: string;
}

export function getIqamaExpiryStatus(expiryDateStr?: string): IqamaStatusResult {
  if (!expiryDateStr) {
    return {
      daysLeft: null,
      status: 'UNKNOWN',
      badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200',
      label: 'No Expiry Set'
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDateStr);
  if (isNaN(expiry.getTime())) {
    return {
      daysLeft: null,
      status: 'UNKNOWN',
      badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200',
      label: 'Invalid Date'
    };
  }
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return {
      daysLeft,
      status: 'EXPIRED',
      badgeClass: 'bg-rose-600 text-white font-black animate-pulse shadow-xs',
      label: `EXPIRED (${Math.abs(daysLeft)} days ago)`
    };
  } else if (daysLeft <= 5) {
    return {
      daysLeft,
      status: 'URGENT',
      badgeClass: 'bg-rose-500 text-white font-bold shadow-xs',
      label: `CRITICAL: ${daysLeft} days left`
    };
  } else if (daysLeft <= 15) {
    return {
      daysLeft,
      status: 'WARNING',
      badgeClass: 'bg-amber-400 text-slate-950 font-black shadow-xs',
      label: `WARNING: ${daysLeft} days left`
    };
  } else if (daysLeft <= 30) {
    return {
      daysLeft,
      status: 'NOTICE',
      badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
      label: `${daysLeft} days left`
    };
  } else {
    return {
      daysLeft,
      status: 'OK',
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium',
      label: `Valid (${daysLeft}d left)`
    };
  }
}
