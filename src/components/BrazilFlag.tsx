export function BrazilFlag() {
  return (
    <span
      aria-label="Brasil"
      role="img"
      className="flex h-3.5 w-5 flex-col overflow-hidden rounded-[2px] bg-muted"
    >
      <span className="h-1/3 bg-flag-green" />
      <span className="flex h-1/3 items-center justify-center bg-flag-yellow">
        <span className="size-1 rounded-full bg-flag-blue" />
      </span>
      <span className="h-1/3 bg-flag-green" />
    </span>
  );
}
