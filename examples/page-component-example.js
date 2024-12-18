"use client";

import { useEffect } from "react";
import MemoryProfiler from "nextjs-memory-profiler";

const profiler = new MemoryProfiler({
  threshold: 50,
});

export default function Page({ params }) {
  useEffect(() => {
    // Route profiling başlat
    const routeProfiler = profiler.startRouteProfiler(`/pages/${params.slug}`);

    // Component unmount olduğunda profiling'i sonlandır
    return () => {
      const results = routeProfiler.end();
      // Sonuçlar otomatik olarak kaydedilir ve analiz edilir
    };
  }, [params.slug]);

  return <div>{/* Sayfa içeriği */}</div>;
}
