const STARS = [
  { top: 6, left: 8, size: 2, delay: 0 },
  { top: 12, left: 22, size: 3, delay: 1.2 },
  { top: 4, left: 37, size: 2, delay: 2.1 },
  { top: 18, left: 51, size: 2, delay: 0.6 },
  { top: 9, left: 64, size: 3, delay: 1.8 },
  { top: 15, left: 78, size: 2, delay: 2.7 },
  { top: 5, left: 91, size: 2, delay: 0.9 },
  { top: 26, left: 5, size: 2, delay: 1.5 },
  { top: 31, left: 17, size: 2, delay: 2.4 },
  { top: 24, left: 33, size: 3, delay: 0.3 },
  { top: 35, left: 46, size: 2, delay: 1.1 },
  { top: 28, left: 59, size: 2, delay: 2.9 },
  { top: 33, left: 72, size: 2, delay: 0.7 },
  { top: 22, left: 86, size: 3, delay: 1.9 },
  { top: 29, left: 95, size: 2, delay: 2.2 },
  { top: 44, left: 11, size: 2, delay: 0.4 },
  { top: 49, left: 27, size: 3, delay: 1.6 },
  { top: 41, left: 42, size: 2, delay: 2.5 },
  { top: 52, left: 55, size: 2, delay: 0.8 },
  { top: 46, left: 69, size: 2, delay: 1.3 },
  { top: 55, left: 82, size: 3, delay: 2.8 },
  { top: 43, left: 93, size: 2, delay: 0.2 },
  { top: 63, left: 7, size: 2, delay: 1.7 },
  { top: 68, left: 24, size: 2, delay: 2.6 },
  { top: 61, left: 38, size: 3, delay: 0.5 },
  { top: 71, left: 52, size: 2, delay: 1.4 },
  { top: 66, left: 66, size: 2, delay: 2.3 },
  { top: 73, left: 79, size: 2, delay: 0.1 },
  { top: 64, left: 90, size: 3, delay: 1.0 },
  { top: 82, left: 15, size: 2, delay: 2.0 },
  { top: 87, left: 34, size: 2, delay: 0.6 },
  { top: 79, left: 48, size: 2, delay: 1.8 },
  { top: 88, left: 62, size: 3, delay: 2.7 },
  { top: 84, left: 75, size: 2, delay: 0.9 },
  { top: 91, left: 88, size: 2, delay: 1.5 },
];

export default function Stars({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`} aria-hidden="true">
      {STARS.map((star, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
