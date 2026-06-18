export default function Loading() {
  return (
    <div className="grid gap-5 animate-pulse">
      <div className="h-8 w-40 rounded-xl bg-rose-100" />
      <div className="h-32 rounded-2xl bg-white shadow-sm" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="aspect-square rounded-2xl bg-rose-100" />
        ))}
      </div>
    </div>
  );
}
