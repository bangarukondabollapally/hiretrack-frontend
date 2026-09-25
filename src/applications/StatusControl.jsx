import React from 'react';
import './StatusControl.css';

const STATUS_OPTIONS = [
  { value: 'APPLIED', label: 'Applied', class: 'status-badge--applied' },
  { value: 'SCREENING', label: 'Screening', class: 'status-badge--screening' },
  { value: 'INTERVIEW', label: 'Interview', class: 'status-badge--interview' },
  { value: 'OFFER', label: 'Offer', class: 'status-badge--offer' },
  { value: 'REJECTED', label: 'Rejected', class: 'status-badge--rejected' },
  { value: 'WITHDRAWN', label: 'Withdrawn', class: 'status-badge--withdrawn' }
];

export default function StatusControl({ value, onChange, readOnly = false }) {
  if (readOnly) {
    const matched = STATUS_OPTIONS.find(s => s.value === value) || { label: value, class: '' };
    return <span className={`status-badge ${matched.class}`}>{matched.label}</span>;
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`status-select status-select--${value?.toLowerCase()}`}
    >
      {STATUS_OPTIONS.map((status) => (
        <option key={status.value} value={status.value}>
          {status.label}
        </option>
      ))}
    </select>
  );
}

export { STATUS_OPTIONS };
