import { useState, useEffect, useRef } from 'react';
import './DatePickerPopover.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function DatePickerPopover({
  value = '',
  onChange,
  label,
  placeholder = 'Select date...',
  disabled = false,
  required = false
}) {
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // If touch device, render native input directly
  if (isTouchDevice) {
    return (
      <div className="date-picker-wrapper">
        {label && <label className="date-picker-label">{label} {required && <span className="required">*</span>}</label>}
        <input
          type="date"
          className="field-input date-picker-native"
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          disabled={disabled}
          required={required}
        />
      </div>
    );
  }

  // Desktop custom calendar popover
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse initial date or default to current date
  const parseDateStr = (dateStr) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date();
  };

  const selectedDate = value ? parseDateStr(value) : null;
  const [viewDate, setViewDate] = useState(() => parseDateStr(value));

  useEffect(() => {
    if (value) {
      setViewDate(parseDateStr(value));
    }
  }, [value]);

  // Outside click & ESC listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDay = (dayNum) => {
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, '0');
    const day = String(dayNum).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    onChange && onChange(dateStr);
    setIsOpen(false);
  };

  // Generate day grid for current viewDate month
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  const formattedDisplay = selectedDate ? (
    `${MONTH_NAMES[selectedDate.getMonth()].slice(0, 3)} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`
  ) : placeholder;

  return (
    <div className="date-picker-wrapper" ref={containerRef}>
      {label && <label className="date-picker-label">{label} {required && <span className="required">*</span>}</label>}
      <button
        type="button"
        className={`date-picker-trigger ${isOpen ? 'date-picker-trigger--open' : ''} ${!value ? 'date-picker-trigger--placeholder' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className="date-picker-trigger__text">{formattedDisplay}</span>
        <svg className="date-picker-trigger__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {isOpen && (
        <div className="date-picker-popover" role="dialog" aria-label="Choose Date">
          <div className="date-picker-popover__header">
            <button type="button" className="date-picker-popover__nav-btn" onClick={handlePrevMonth} aria-label="Previous month">
              ‹
            </button>
            <span className="date-picker-popover__title">
              {MONTH_NAMES[month]} {year}
            </span>
            <button type="button" className="date-picker-popover__nav-btn" onClick={handleNextMonth} aria-label="Next month">
              ›
            </button>
          </div>

          <div className="date-picker-popover__weekdays">
            {WEEKDAY_NAMES.map(d => (
              <span key={d} className="weekday-header">{d}</span>
            ))}
          </div>

          <div className="date-picker-popover__grid">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="calendar-day calendar-day--empty" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected = selectedDate &&
                selectedDate.getFullYear() === year &&
                selectedDate.getMonth() === month &&
                selectedDate.getDate() === dayNum;
              const isToday = isCurrentMonth && todayDate === dayNum;

              return (
                <button
                  type="button"
                  key={dayNum}
                  className={`calendar-day ${isSelected ? 'calendar-day--selected' : ''} ${isToday ? 'calendar-day--today' : ''}`}
                  onClick={() => handleSelectDay(dayNum)}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
