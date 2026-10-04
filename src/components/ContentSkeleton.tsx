/** Skeleton for course panels and exercise preparation. */
export default function ContentSkeleton() {
  return (
    <div role="status" aria-label="Loading content" aria-busy="true" className="w-full space-y-6 p-6 sm:p-8">
      <span className="sr-only">Loading content</span>
      <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
        <div className="h-7 w-2/5 rounded bg-ink-100" />
        <div className="h-4 w-3/5 rounded bg-ink-100" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => <div key={i} className="h-28 rounded-xl bg-ink-100" />)}
        </div>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex gap-4 border-b border-hairline py-4">
            <div className="size-8 shrink-0 rounded bg-ink-100" />
            <div className="h-4 flex-1 self-center rounded bg-ink-100" />
            <div className="h-4 w-1/5 self-center rounded bg-ink-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
