const v8 = require("v8");
const fs = require("fs");
const path = require("path");

class MemoryProfiler {
  constructor(options = {}) {
    this.interval = options.interval || 5000;
    this.threshold = options.threshold || 100;
    this.samples = [];
    this.routeMemory = new Map();
    this.isRunning = false;
    this.logFile = path.join(process.cwd(), "memory-profile.log");
    this.isServer = typeof window === 'undefined';
  }

  measureMemory(initialMemory = null) {
    if (!this.isServer) {
      console.warn('Memory profiling is only available on the server side');
      return {
        timestamp: new Date().toISOString(),
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
      };
    }

    const currentMemory = process.memoryUsage();
    
    if (!initialMemory) {
      return {
        timestamp: new Date().toISOString(),
        heapUsed: Math.round(currentMemory.heapUsed / 1024 / 1024),
        heapTotal: Math.round(currentMemory.heapTotal / 1024 / 1024),
        external: Math.round(currentMemory.external / 1024 / 1024),
      };
    }

    return {
      timestamp: new Date().toISOString(),
      heapUsed: Math.round((currentMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024),
      heapTotal: Math.round((currentMemory.heapTotal - initialMemory.heapTotal) / 1024 / 1024),
      external: Math.round((currentMemory.external - initialMemory.external) / 1024 / 1024),
    };
  }

  startRouteProfiler(route) {
    if (!this.isServer) {
      console.warn('Memory profiling is only available on the server side');
      return {
        end: () => ({
          heapUsed: 0,
          heapTotal: 0,
          external: 0,
          duration: 0
        })
      };
    }

    const startTime = process.hrtime();
    const initialMemory = process.memoryUsage();
    
    return {
      end: () => {
        const diff = process.hrtime(startTime);
        const duration = diff[0] * 1000 + diff[1] / 1000000;
        const memoryDiff = this.measureMemory(initialMemory);
        
        this.recordRouteMemory(route, { ...memoryDiff, duration });
        return { ...memoryDiff, duration };
      }
    };
  }

  recordRouteMemory(route, memoryDiff) {
    if (!this.isServer) return;

    if (!this.routeMemory.has(route)) {
      this.routeMemory.set(route, []);
    }

    const routeStats = this.routeMemory.get(route);
    routeStats.push({
      timestamp: new Date().toISOString(),
      ...memoryDiff,
    });

    if (routeStats.length > 1) {
      const lastTwo = routeStats.slice(-2);
      const increase = lastTwo[1].heapUsed - lastTwo[0].heapUsed;

      if (increase > this.threshold) {
        const warning = `⚠️ Route Memory Leak Uyarısı [${route}]: ${increase}MB artış tespit edildi`;
        this.writeLog(warning);
        console.warn(warning);
      }
    }
  }

  start() {
    if (!this.isServer) {
      console.warn('Memory profiling is only available on the server side');
      return;
    }

    if (this.isRunning) return;
    this.isRunning = true;

    console.log("Memory profiling başlatıldı...");
    this.writeLog("Memory profiling başlatıldı");

    this.intervalId = setInterval(() => {
      const memoryStats = this.measureMemory();
      const heapStats = v8.getHeapStatistics();
      
      const sample = {
        ...memoryStats,
        heapSizeLimit: Math.round(heapStats.heap_size_limit / 1024 / 1024),
      };

      this.samples.push(sample);
      this.analyzeMemory(sample);
    }, this.interval);

    // Uygulama kapanırken profiler'ı durdur
    process.on('SIGINT', () => {
      this.stop();
    });

    process.on('SIGTERM', () => {
      this.stop();
    });
  }

  stop() {
    if (!this.isServer || !this.isRunning) return;

    clearInterval(this.intervalId);
    this.isRunning = false;
    this.writeLog("Memory profiling durduruldu");
    console.log("Memory profiling durduruldu");

    this.generateReport();
  }

  analyzeMemory(sample) {
    if (this.samples.length < 2) return;

    const previousSample = this.samples[this.samples.length - 2];
    const memoryIncrease = sample.heapUsed - previousSample.heapUsed;

    if (memoryIncrease > this.threshold) {
      const warning = `⚠️ Memory Leak Uyarısı: ${memoryIncrease}MB artış tespit edildi`;
      this.writeLog(warning);
      console.warn(warning);
    }

    const heapUsagePercent = (sample.heapUsed / sample.heapSizeLimit) * 100;
    if (heapUsagePercent > 80) {
      const warning = `⚠️ Yüksek Heap Kullanımı: %${heapUsagePercent.toFixed(2)}`;
      this.writeLog(warning);
      console.warn(warning);
    }
  }

  generateReport() {
    if (!this.isServer || this.samples.length === 0) return;

    try {
      const report = {
        startTime: this.samples[0].timestamp,
        endTime: this.samples[this.samples.length - 1].timestamp,
        totalSamples: this.samples.length,
        memoryTrend: this.calculateMemoryTrend(),
        maxHeapUsed: Math.max(...this.samples.map((s) => s.heapUsed)),
        minHeapUsed: Math.min(...this.samples.map((s) => s.heapUsed)),
        averageHeapUsed: this.calculateAverage(
          this.samples.map((s) => s.heapUsed)
        ),
        routeAnalysis: this.generateRouteReport(),
      };

      const reportPath = path.join(process.cwd(), "memory-report.json");
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`Detaylı rapor oluşturuldu: ${reportPath}`);
    } catch (error) {
      console.error('Rapor oluşturulurken hata:', error);
    }
  }

  generateRouteReport() {
    const routeReport = {};

    for (const [route, samples] of this.routeMemory.entries()) {
      try {
        routeReport[route] = {
          totalRequests: samples.length,
          averageHeapUsed: this.calculateAverage(samples.map((s) => s.heapUsed)),
          averageDuration: this.calculateAverage(samples.map((s) => s.duration)),
          maxHeapUsed: Math.max(...samples.map((s) => s.heapUsed)),
          minHeapUsed: Math.min(...samples.map((s) => s.heapUsed)),
          trend: this.calculateRouteTrend(samples),
        };
      } catch (error) {
        console.error(`Route analizi oluşturulurken hata (${route}):`, error);
      }
    }

    return routeReport;
  }

  calculateRouteTrend(samples) {
    if (samples.length < 2) return "Yetersiz veri";

    try {
      const firstSample = samples[0].heapUsed;
      const lastSample = samples[samples.length - 1].heapUsed;
      const trend = ((lastSample - firstSample) / firstSample) * 100;

      return `${trend.toFixed(2)}% ${trend > 0 ? "artış" : "azalış"}`;
    } catch (error) {
      console.error('Trend hesaplanırken hata:', error);
      return "Hesaplanamadı";
    }
  }

  calculateMemoryTrend() {
    if (this.samples.length < 2) return "Yetersiz veri";

    try {
      const firstSample = this.samples[0].heapUsed;
      const lastSample = this.samples[this.samples.length - 1].heapUsed;
      const trend = ((lastSample - firstSample) / firstSample) * 100;

      return `${trend.toFixed(2)}% ${trend > 0 ? "artış" : "azalış"}`;
    } catch (error) {
      console.error('Trend hesaplanırken hata:', error);
      return "Hesaplanamadı";
    }
  }

  calculateAverage(numbers) {
    if (!numbers || numbers.length === 0) return 0;
    return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length);
  }

  writeLog(message) {
    if (!this.isServer) return;
    
    try {
      const logMessage = `[${new Date().toISOString()}] ${message}\n`;
      fs.appendFileSync(this.logFile, logMessage);
    } catch (error) {
      console.error('Log yazılırken hata:', error);
    }
  }
}

module.exports = MemoryProfiler;
