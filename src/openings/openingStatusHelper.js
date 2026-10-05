/**
 * Shared Placement Opening Status Helper
 *
 * Status rules:
 * 1. "Closed": manually closed (opening.status === 'CLOSED')
 * 2. "Expired": deadline date passed (comparing YYYY-MM-DD dates only, ignoring time component)
 * 3. "Open": active and deadline is today or in the future
 */

export function getOpeningStatus(opening) {
  if (!opening) {
    return {
      status: 'UNKNOWN',
      label: 'Unknown',
      isClosedOrExpired: false,
      reason: null,
    };
  }

  if (opening.status === 'CLOSED') {
    return {
      status: 'CLOSED',
      label: 'Closed',
      isClosedOrExpired: true,
      reason: 'Opening is closed',
    };
  }

  if (opening.deadline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Extract YYYY-MM-DD parts to construct local midnight date
    const dateParts = String(opening.deadline).split('T')[0].split('-');
    if (dateParts.length === 3) {
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);
      const deadlineDate = new Date(year, month, day, 0, 0, 0, 0);

      if (deadlineDate < today) {
        return {
          status: 'EXPIRED',
          label: 'Expired',
          isClosedOrExpired: true,
          reason: 'Application deadline has passed',
        };
      }
    }
  }

  return {
    status: 'OPEN',
    label: 'Open',
    isClosedOrExpired: false,
    reason: null,
  };
}
