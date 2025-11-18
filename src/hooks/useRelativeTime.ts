import { useState, useEffect } from 'react';

const useRelativeTime = (isoDate: string) => {
    const intervals: { [key: string]: number } = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
      second: 1
    };

    const formatRelativeTime = (date: Date) => {
      const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

      if (seconds < 30) return 'Just now';

      for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            const plural = interval > 1 ? 's' : '';
            if (unit === 'hour') return `${interval}h ago`;
            if (unit === 'minute') return `${interval}m ago`;
            if (unit === 'second') return `${interval}s ago`;
            return `${interval} ${unit}${plural} ago`;
        }
      }
      return 'Just now';
    };

    const date = new Date(isoDate);
    const [relativeTime, setRelativeTime] = useState(() => formatRelativeTime(date));

    useEffect(() => {
        setRelativeTime(formatRelativeTime(date)); // Set initial value
        const intervalId = setInterval(() => {
            setRelativeTime(formatRelativeTime(date));
        }, 60000); // Update every minute

        return () => clearInterval(intervalId);
    }, [isoDate]);

    return relativeTime;
};

export default useRelativeTime;
