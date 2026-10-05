import { describe, it, expect } from 'vitest';
import { getOpeningStatus } from './openingStatusHelper';

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
