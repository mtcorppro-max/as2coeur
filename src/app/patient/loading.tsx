export default function Loading() {
  return (
    <div className="grid gap-5 animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-rose-100" />
      <div className="h-4 w-64 rounded-lg bg-rose-100" />
      <div className="h-14 rounded-2xl bg-rose-200" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-white shadow-sm" />
        ))}
      </div>
      <div className="h-32 rounded-2xl bg-white shadow-sm" />
    </div>
  );
}
