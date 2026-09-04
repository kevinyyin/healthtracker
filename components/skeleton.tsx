export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-foreground/10 ${className}`} />;
}

export function PageHeaderSkeleton({ eyebrowWidth = "w-24" }: { eyebrowWidth?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <SkeletonBlock className={`h-3 ${eyebrowWidth}`} />
      <SkeletonBlock className="h-8 w-40" />
    </div>
  );
}
