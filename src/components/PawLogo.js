'use client';

export default function PawLogo({ size = 48, className = '', animate = false }) {
  return (
    <>
      {animate && (
        <style>{`
          @keyframes pulse-logo {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.85; }
          }
        `}</style>
      )}
      <img
        src="/GoSniff_Logo.png"
        alt="GoSniff"
        width={size}
        height={size}
        className={className}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          animation: animate ? 'pulse-logo 1.5s ease-in-out infinite' : 'none',
        }}
      />
    </>
  );
}
