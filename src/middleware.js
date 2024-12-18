const { performance } = require("perf_hooks");

class MemoryMiddleware {
  constructor(profiler) {
    this.profiler = profiler;
  }

  middleware() {
    return async (req, res, next) => {
      const routeStart = performance.now();
      const initialMemory = process.memoryUsage();

      // Route işlemi tamamlandığında
      res.on("finish", () => {
        const routeEnd = performance.now();
        const finalMemory = process.memoryUsage();

        const memoryDiff = {
          heapUsed: Math.round(
            (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024
          ),
          heapTotal: Math.round(
            (finalMemory.heapTotal - initialMemory.heapTotal) / 1024 / 1024
          ),
          external: Math.round(
            (finalMemory.external - initialMemory.external) / 1024 / 1024
          ),
          duration: Math.round(routeEnd - routeStart),
        };

        this.profiler.recordRouteMemory(req.url, memoryDiff);
      });

      if (typeof next === "function") {
        next();
      }
    };
  }
}
