export default function PawLogo({ size = 48, color = '#2D6A4F', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill={color}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Main pad */}
      <ellipse cx="50" cy="65" rx="22" ry="20" />
      {/* Top left toe */}
      <ellipse cx="28" cy="35" rx="10" ry="13" transform="rotate(-15 28 35)" />
      {/* Top right toe */}
      <ellipse cx="72" cy="35" rx="10" ry="13" transform="rotate(15 72 35)" />
      {/* Inner left toe */}
      <ellipse cx="38" cy="28" rx="8" ry="11" transform="rotate(-5 38 28)" />
      {/* Inner right toe */}
      <ellipse cx="62" cy="28" rx="8" ry="11" transform="rotate(5 62 28)" />
    </svg>
  );
}
