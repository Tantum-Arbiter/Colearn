export default function Moon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="moon-glow" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="#FFF7DC" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFF7DC" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#moon-glow)" />
      <circle cx="50" cy="50" r="32" fill="#FBEFC9" />
      <circle cx="50" cy="50" r="32" fill="none" stroke="#EBDCA9" strokeWidth="1.5" />
      <circle cx="40" cy="38" r="5" fill="#EEDFAC" />
      <circle cx="58" cy="52" r="7" fill="#EEDFAC" />
      <circle cx="45" cy="61" r="3.5" fill="#EEDFAC" />
      <circle cx="61" cy="35" r="3" fill="#EEDFAC" />
      <circle cx="34" cy="52" r="2.5" fill="#EEDFAC" />
    </svg>
  );
}
