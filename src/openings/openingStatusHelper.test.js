import { describe, it, expect } from 'vitest';
import { getOpeningStatus, formatYearOfStudy, formatPublishedBy } from './openingStatusHelper';

describe('getOpeningStatus', () => {
  it('returns CLOSED status when opening.status is CLOSED', () => {
    const res = getOpeningStatus({ status: 'CLOSED', deadline: '2099-12-31' });
    expect(res.status).toBe('CLOSED');
    expect(res.label).toBe('Closed');
    expect(res.isClosedOrExpired).toBe(true);
  });

  it('returns EXPIRED status when deadline is in the past', () => {
    const pastDate = '2020-01-01';
    const res = getOpeningStatus({ status: 'OPEN', deadline: pastDate });
    expect(res.status).toBe('EXPIRED');
    expect(res.label).toBe('Expired');
    expect(res.isClosedOrExpired).toBe(true);
  });

  it('returns Closes today when deadline is today', () => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const res = getOpeningStatus({ status: 'OPEN', deadline: todayStr });
    expect(res.status).toBe('CLOSING_SOON');
    expect(res.label).toBe('Closes today');
    expect(res.warningLevel).toBe('danger');
  });

  it('returns Closing soon with danger warning level when 1 or 2 days left', () => {
    const d1 = new Date();
    d1.setDate(d1.getDate() + 2);
    const dateStr = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, '0')}-${String(d1.getDate()).padStart(2, '0')}`;

    const res = getOpeningStatus({ status: 'OPEN', deadline: dateStr });
    expect(res.status).toBe('CLOSING_SOON');
    expect(res.label).toContain('Closing soon');
    expect(res.warningLevel).toBe('danger');
  });

  it('returns Closing soon with warning level when 3 to 5 days left', () => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    const dateStr = d.toISOString().split('T')[0];

    const res = getOpeningStatus({ status: 'OPEN', deadline: dateStr });
    expect(res.status).toBe('CLOSING_SOON');
    expect(res.label).toContain('Closing soon');
    expect(res.warningLevel).toBe('warning');
  });

  it('returns OPEN when deadline is more than 5 days away', () => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    const dateStr = d.toISOString().split('T')[0];

    const res = getOpeningStatus({ status: 'OPEN', deadline: dateStr });
    expect(res.status).toBe('OPEN');
    expect(res.label).toBe('Open');
    expect(res.warningLevel).toBe('normal');
  });
});

describe('formatYearOfStudy', () => {
  it('formats year range compactly', () => {
    expect(formatYearOfStudy('2nd Year - 4th Year')).toBe('2nd–4th year');
    expect(formatYearOfStudy('1st Year - 2nd Year')).toBe('1st–2nd year');
    expect(formatYearOfStudy('3rd Year - 3rd Year')).toBe('3rd year');
    expect(formatYearOfStudy('All Years')).toBe('All years');
  });
});

describe('formatPublishedBy', () => {
  it('prevents duplicated Published by prefix', () => {
    expect(formatPublishedBy('Placement Cell')).toBe('Published by: Placement Cell');
    expect(formatPublishedBy('Published by: Placement Cell')).toBe('Published by: Placement Cell');
  });
});

import { formatEligibilityText } from './StudentOpeningCard';

describe('formatEligibilityText', () => {
  it('hides Min CGPA when minCgpa is 0 or 0.0 or null', () => {
    const opZero = { degreeTypes: 'B.Tech', eligibleBranches: 'CSE', minCgpa: 0, maxBacklogs: 2 };
    expect(formatEligibilityText(opZero)).toBe('Degrees: B.Tech • Branches: CSE • Max Backlogs: 2');

    const opZeroStr = { degreeTypes: 'B.Tech', eligibleBranches: 'CSE', minCgpa: '0.0', maxBacklogs: 2 };
    expect(formatEligibilityText(opZeroStr)).toBe('Degrees: B.Tech • Branches: CSE • Max Backlogs: 2');

    const opNull = { degreeTypes: 'B.Tech', eligibleBranches: 'ALL', minCgpa: null };
    expect(formatEligibilityText(opNull)).toBe('Degrees: B.Tech • Branches: All Branches');
  });

  it('shows Min CGPA when minCgpa is greater than 0', () => {
    const op = { degreeTypes: 'B.Tech, M.Tech', eligibleBranches: 'CSE, ECE', minCgpa: 7.5, maxBacklogs: 0, packageDetails: '12 LPA', yearOfStudy: '4th Year' };
    const result = formatEligibilityText(op);
    expect(result).toContain('Min CGPA: 7.5');
    expect(result).toContain('Max Backlogs: 0');
    expect(result).toContain('12 LPA');
    expect(result).toContain('4th Year');
  });
});


