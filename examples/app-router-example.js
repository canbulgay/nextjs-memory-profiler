// middleware.ts
import MemoryProfiler from "nextjs-memory-profiler";

const profiler = new MemoryProfiler({
  threshold: 50, // 50MB üzeri artışlarda uyarı ver
});

// Profiler'ı başlat
profiler.start();

export function middleware(request) {
  // Route profiling başlat
  const routeProfiler = profiler.startRouteProfiler(request.nextUrl.pathname);

  // Response tamamlandığında
  request.nextUrl.searchParams.forEach(() => {
    // Profiling'i sonlandır ve sonuçları al
    const results = routeProfiler.end();
    
    // Sonuçlar otomatik olarak kaydedilir ve analiz edilir
    // Memory leak varsa otomatik olarak uyarı verilir
  });
}

// Uygulama kapatıldığında profiler'ı durdur
process.on("SIGINT", () => {
  profiler.stop();
  process.exit();
});
