export default function Loading() {
  return (
    <div className="grid gap-4 animate-pulse">
      <div className="h-8 w-32 rounded-xl bg-rose-100" />
      <div className="flex max-h-80 flex-col gap-3 rounded-xl bg-rose-50 p-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`h-12 w-2/3 rounded-2xl bg-rose-200 ${i % 2 === 0 ? "self-start" : "self-end"}`}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <div className="h-11 flex-1 rounded-xl bg-white shadow-sm" />
        <div className="h-11 w-24 rounded-xl bg-rose-200" />
      </div>
    </div>
  );
}
