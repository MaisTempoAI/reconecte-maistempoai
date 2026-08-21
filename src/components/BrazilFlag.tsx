export function BrazilFlag({ className = "h-3.5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 20"
      role="img"
      aria-label="Brasil"
      className={`${className} shrink-0 rounded-[2px]`}
    >
      <rect width="28" height="20" fill="oklch(0.55 0.16 150)" />
      <path d="M14 2.4 25.4 10 14 17.6 2.6 10Z" fill="oklch(0.86 0.17 96)" />
      <circle cx="14" cy="10" r="4.2" fill="oklch(0.42 0.14 258)" />
      <path
        d="M9.9 8.6c2.9-.7 6-.4 8.4 1.1"
        fill="none"
        stroke="oklch(0.98 0 0)"
        strokeWidth="1.1"
      />
    </svg>
  );
}
