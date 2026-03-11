import React from "react";

/** Bloque de skeleton animado */
function SkeletonBlock({ className = "" }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-slate-700 rounded-xl ${className}`} />
  );
}

/** Skeleton para una tarjeta de categoría */
export function CategorySkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="w-8 h-8 rounded-full" />
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-4 w-16 ml-auto" />
      </div>
      <SkeletonBlock className="h-3 w-full" />
      <SkeletonBlock className="h-3 w-3/4" />
      <SkeletonBlock className="h-3 w-1/2" />
    </div>
  );
}

/** Skeleton para la pantalla de carga inicial */
export function AppLoadingSkeleton() {
  return (
    <div className="max-w-xl mx-auto px-4 pt-6 space-y-3">
      <SkeletonBlock className="h-10 w-full mb-4" />
      <CategorySkeleton />
      <CategorySkeleton />
      <CategorySkeleton />
    </div>
  );
}
