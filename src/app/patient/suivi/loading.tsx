export default function Loading() {
  return (
    <div className="grid gap-6 animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-rose-100" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 h-5 w-32 rounded-lg bg-rose-100" />
          <div className="h-48 rounded-xl bg-rose-50" />
        </div>
      ))}
    </div>
  );
}
