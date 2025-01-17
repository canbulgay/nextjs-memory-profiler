// middleware.ts
import { NextResponse } from "next/server";
import MemoryProfiler from "nextjs-memory-profiler";

// Singleton profiler instance
let profiler;
if (!profiler) {
  profiler = new MemoryProfiler({
    threshold: 50,
    interval: 5000,
  });
  profiler.start();
  console.log("🔍 Memory Profiler başlatıldı");
}

export async function middleware(request) {
  const pathname = request.nextUrl.pathname;

  // Bazı rotaları ignore et
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  console.log(`📊 Route profiling başladı: ${pathname}`);
  const routeProfiler = profiler.startRouteProfiler(pathname);

  // İşlem sonunda profiling'i sonlandır
  const results = routeProfiler.end();
  console.log(`
    🔍 Route Memory Raporu [${pathname}]:
    - Heap Kullanımı: ${results.heapUsed}MB
    - İşlem Süresi: ${results.duration}ms
  `);

  return NextResponse.next();
}
