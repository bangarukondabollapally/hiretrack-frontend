/**
 * Shared Placement Opening Status Helper
 *
 * Status rules:
 * 1. "Closed": manually closed (opening.status === 'CLOSED')
 * 2. "Expired": deadline date passed (comparing YYYY-MM-DD dates only, ignoring time component)
 * 3. "Closes today": deadline is today (0 days left)
 * 4. "Closing soon (N days left)": deadline <= 5 days away (2 days or fewer = danger warning level, 3–5 days = warning level)
 * 5. "Open": active and deadline > 5 days away
 */

export function getOpeningStatus(opening) {
  if (!opening) {
    return {
      status: 'UNKNOWN',
      label: 'Unknown',
      isClosedOrExpired: false,
      reason: null,
      daysLeft: null,
      warningLevel: 'normal',
    };
  }

  if (opening.status === 'CLOSED') {
    return {
      status: 'CLOSED',
      label: 'Closed',
      isClosedOrExpired: true,
      reason: 'Opening is closed',
      daysLeft: null,
      warningLevel: 'muted',
    };
  }

  if (opening.deadline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateParts = String(opening.deadline).split('T')[0].split('-');
    if (dateParts.length === 3) {
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);
      const deadlineDate = new Date(year, month, day, 0, 0, 0, 0);

      const diffTime = deadlineDate.getTime() - today.getTime();
      const daysLeft = Math.round(diffTime / (1000 * 3600 * 24));

      if (daysLeft < 0) {
        return {
          status: 'EXPIRED',
          label: 'Expired',
          isClosedOrExpired: true,
          reason: 'Application deadline has passed',
          daysLeft,
          warningLevel: 'muted',
        };
      }

      if (daysLeft === 0) {
        return {
          status: 'CLOSING_SOON',
          label: 'Closes today',
          isClosedOrExpired: false,
          reason: null,
          daysLeft: 0,
          warningLevel: 'danger',
        };
      }

      if (daysLeft <= 2) {
        return {
          status: 'CLOSING_SOON',
          label: `Closing soon (${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left)`,
          isClosedOrExpired: false,
          reason: null,
          daysLeft,
          warningLevel: 'danger',
        };
      }

      if (daysLeft <= 5) {
        return {
          status: 'CLOSING_SOON',
          label: `Closing soon (${daysLeft} days left)`,
          isClosedOrExpired: false,
          reason: null,
          daysLeft,
          warningLevel: 'warning',
        };
      }

      return {
        status: 'OPEN',
        label: 'Open',
        isClosedOrExpired: false,
        reason: null,
        daysLeft,
        warningLevel: 'normal',
      };
    }
  }

  return {
    status: 'OPEN',
    label: 'Open',
    isClosedOrExpired: false,
    reason: null,
    daysLeft: null,
    warningLevel: 'normal',
  };
}

export function formatYearOfStudy(yearOfStudy) {
  if (!yearOfStudy || yearOfStudy === 'All Years' || yearOfStudy === 'All years') return 'All years';
  const str = String(yearOfStudy).trim();
  if (str.includes('-')) {
    const parts = str.split('-').map(s => s.trim());
    if (parts.length === 2) {
      if (parts[0].toLowerCase() === parts[1].toLowerCase()) {
        const single = parts[0].replace(/\s*year/i, '').trim();
        return `${single.toLowerCase()} year`;
      }
      const start = parts[0].replace(/\s*year/i, '').trim();
      const end = parts[1].replace(/\s*year/i, '').trim().toLowerCase();
      return `${start}–${end} year`;
    }
  }
  const clean = str.replace(/\s*year/i, '').trim();
  return `${clean.toLowerCase()} year`;
}

export function formatPublishedBy(publisher, fallbackOfficeName) {
  let name = publisher || fallbackOfficeName || 'Placement Cell';
  if (name.toLowerCase().startsWith('published by:')) {
    name = name.substring(13).trim();
  }
  return `Published by: ${name}`;
}
