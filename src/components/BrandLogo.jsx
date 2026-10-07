import './BrandLogo.css';

export default function BrandLogo({ size = 'md', showText = true, className = '' }) {
  return (
    <span className={`brand-logo brand-logo--${size} ${className}`}>
      <span className="brand-logo__mark" aria-hidden="true">H</span>
      {showText && <span className="brand-logo__text">HireTrack</span>}
    </span>
  );
}
