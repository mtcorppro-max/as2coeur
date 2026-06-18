export default function Loading() {
  return (
    <div className="grid gap-5 animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-rose-100" />
      <div className="grid gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-white shadow-sm" />
        ))}
      </div>
    </div>
  );
}
