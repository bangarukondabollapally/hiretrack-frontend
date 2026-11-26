import { useRef, useState } from 'react';
import './SkillTagInput.css';

/** Adds a skill to a list unless it is blank or a case-insensitive duplicate. */
export function addSkill(list, raw, maxItems = 60) {
  const skill = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 50);
  if (!skill || list.length >= maxItems) return list;
  if (list.some((s) => s.toLowerCase() === skill.toLowerCase())) return list;
  return [...list, skill];
}

/**
 * Chip-style input for a list of skills. Enter or comma adds; Backspace on an
 * empty field removes the last chip. Pasting "React, Node.js, SQL" adds all three.
 */
export default function SkillTagInput({ id, value = [], onChange, placeholder = 'Type a skill and press Enter', maxItems = 60, disabled = false, ariaLabel }) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  const commit = (text) => {
    let next = value;
    for (const part of String(text).split(',')) next = addSkill(next, part, maxItems);
    if (next !== value) onChange(next);
    setDraft('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (draft.trim()) commit(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    // Clicking empty space in the field focuses the text input (mouse convenience; keyboard users tab to it).
    <div
      className={`skill-input ${disabled ? 'skill-input--disabled' : ''}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }}
    >
      {value.map((skill) => (
        <span key={skill} className="skill-input__chip">
          {skill}
          <button
            type="button"
            className="skill-input__remove"
            aria-label={`Remove ${skill}`}
            disabled={disabled}
            onClick={() => onChange(value.filter((s) => s !== skill))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        className="skill-input__field"
        value={draft}
        disabled={disabled || value.length >= maxItems}
        placeholder={value.length >= maxItems ? `Maximum ${maxItems} skills` : value.length ? '' : placeholder}
        aria-label={ariaLabel}
        onChange={(e) => {
          const text = e.target.value;
          if (text.includes(',')) commit(text);
          else setDraft(text);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => draft.trim() && commit(draft)}
        maxLength={50}
      />
    </div>
  );
}
