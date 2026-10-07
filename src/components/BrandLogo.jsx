import './BrandLogo.css';

export default function BrandLogo({ size = 'md', showText = true, className = '', as: Component = 'span', ...props }) {
  return (
    <Component className={`brand-logo brand-logo--${size} ${className}`} {...props}>
      <span className="brand-logo__mark" aria-hidden="true">H</span>
      {showText && <span className="brand-logo__text">HireTrack</span>}
    </Component>
  );
}
