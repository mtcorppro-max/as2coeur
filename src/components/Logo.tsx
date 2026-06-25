export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/as2coeur-logo.png" alt="AS2CŒUR" className="h-8 w-auto" />
    </span>
  );
}
