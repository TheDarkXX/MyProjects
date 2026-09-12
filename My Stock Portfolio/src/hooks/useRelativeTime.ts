import { useState, useEffect } from 'react';

/**
 * Hook to format dates into snappy, human-first relative time (e.g. "just now", "12s ago", "2m ago")
 * Automatically ticks every 1 second to keep UI real-time and alive.
 */
export function useRelativeTime(date: Date | string | null | undefined): string {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!date) return;
    // Tick every 1 second for instant second-by-second feedback
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % 1000000);
    }, 1000);
    return () => clearInterval(timer);
  }, [date]);

  if (!date) return 'Waiting...';

  const targetDate = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(targetDate.getTime())) return 'Waiting...';

  const now = new Date();
  const diffSec = Math.max(0, Math.floor((now.getTime() - targetDate.getTime()) / 1000));

  if (diffSec < 5) {
    return 'just now';
  }
  if (diffSec < 60) {
    return `${diffSec}s ago`;
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return `${diffHour}h ago`;
  }
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}
