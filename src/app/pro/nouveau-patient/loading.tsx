export default function Loading() {
  return (
    <div className="grid gap-5 animate-pulse max-w-lg">
      <div className="h-8 w-48 rounded-xl bg-rose-100" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="grid gap-2">
          <div className="h-4 w-24 rounded bg-rose-100" />
          <div className="h-11 rounded-xl bg-white border border-rose-100" />
        </div>
      ))}
      <div className="h-12 rounded-xl bg-rose-200" />
    </div>
  );
}
