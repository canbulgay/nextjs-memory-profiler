const MemoryProfiler = require("./memoryProfiler");

// Profiler'ı başlat
const profiler = new MemoryProfiler({
  interval: 5000, // Her 5 saniyede bir ölçüm
  threshold: 50, // 50MB üzeri artışlarda uyarı ver
});

// Next.js server başlatıldığında
profiler.start();

// Uygulama kapatıldığında
process.on("SIGINT", () => {
  profiler.stop();
  process.exit();
});
