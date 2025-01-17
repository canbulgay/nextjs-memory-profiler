class MemoryProfiler {
  constructor(options = {}) {
    this.interval = options.interval || 5000;
    this.threshold = options.threshold || 100;
    this.samples = [];
    this.routeMemory = new Map();
    this.isRunning = false;
    this.startTime = Date.now();
  }

  measureMemory() {
    // Edge Runtime'da performance.memory olmayabilir
    if (typeof performance === 'undefined' || !performance.memory) {
      return {
        timestamp: new Date().toISOString(),
        heapUsed: 0,
        heapTotal: 0,
        heapLimit: 0
      };
    }

    const memory = performance.memory;
    return {
      timestamp: new Date().toISOString(),
      heapUsed: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      heapTotal: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      heapLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
    };
  }

  startRouteProfiler(route) {
    const startTime = Date.now();
    const initialMemory = this.measureMemory();
    
    return {
      end: () => {
        const endTime = Date.now();
        const finalMemory = this.measureMemory();
        const duration = endTime - startTime;
        
        const memoryDiff = {
          heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
          heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
          duration
        };

        this.recordRouteMemory(route, memoryDiff);

        // Memory leak kontrolü
        if (memoryDiff.heapUsed > this.threshold) {
          console.warn(`
⚠️ Memory Leak Uyarısı [${route}]
- Memory Artışı: ${memoryDiff.heapUsed}MB
- Süre: ${duration}ms
- Toplam Heap: ${finalMemory.heapUsed}MB
          `);
        }

        return memoryDiff;
      }
    };
  }

  recordRouteMemory(route, memoryDiff) {
    if (!this.routeMemory.has(route)) {
      this.routeMemory.set(route, []);
    }

    const routeStats = this.routeMemory.get(route);
    const sample = {
      timestamp: new Date().toISOString(),
      ...memoryDiff
    };

    routeStats.push(sample);

    // Memory leak analizi
    if (routeStats.length > 1) {
      const lastTwo = routeStats.slice(-2);
      const increase = lastTwo[1].heapUsed - lastTwo[0].heapUsed;

      if (increase > this.threshold) {
        console.warn(`
⚠️ Route Memory Leak [${route}]
- Son iki istek arasındaki artış: ${increase}MB
- Toplam istek sayısı: ${routeStats.length}
        `);
      }
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = Date.now();

    console.log(`
🚀 Memory Profiler Başlatıldı
- Ölçüm aralığı: ${this.interval}ms
- Memory leak eşiği: ${this.threshold}MB
    `);

    this.intervalId = setInterval(() => {
      const memoryStats = this.measureMemory();
      this.samples.push(memoryStats);
      this.analyzeMemory(memoryStats);
    }, this.interval);
  }

  stop() {
    if (!this.isRunning) return;

    clearInterval(this.intervalId);
    this.isRunning = false;
    
    const duration = Date.now() - this.startTime;
    console.log(`
⏹️ Memory Profiler Durduruldu
- Çalışma süresi: ${Math.round(duration / 1000)}s
- Toplam örnek: ${this.samples.length}
    `);

    this.generateReport();
  }

  analyzeMemory(sample) {
    if (this.samples.length < 2) return;

    const previousSample = this.samples[this.samples.length - 2];
    const memoryIncrease = sample.heapUsed - previousSample.heapUsed;

    if (memoryIncrease > this.threshold) {
      console.warn(`
⚠️ Genel Memory Leak Uyarısı
- Memory Artışı: ${memoryIncrease}MB
- Toplam Heap: ${sample.heapUsed}MB
      `);
    }

    if (sample.heapLimit > 0) {
      const heapUsagePercent = (sample.heapUsed / sample.heapLimit) * 100;
      if (heapUsagePercent > 80) {
        console.warn(`
⚠️ Yüksek Heap Kullanımı
- Kullanım: %${heapUsagePercent.toFixed(2)}
- Heap: ${sample.heapUsed}MB/${sample.heapLimit}MB
        `);
      }
    }
  }

  generateReport() {
    if (this.samples.length === 0) return;

    const report = {
      startTime: this.samples[0].timestamp,
      endTime: this.samples[this.samples.length - 1].timestamp,
      totalSamples: this.samples.length,
      memoryTrend: this.calculateMemoryTrend(),
      maxHeapUsed: Math.max(...this.samples.map(s => s.heapUsed)),
      minHeapUsed: Math.min(...this.samples.map(s => s.heapUsed)),
      averageHeapUsed: this.calculateAverage(this.samples.map(s => s.heapUsed)),
      routeAnalysis: this.generateRouteReport()
    };

    console.log(`
📊 Memory Profiler Raporu
============================
- Başlangıç: ${report.startTime}
- Bitiş: ${report.endTime}
- Toplam Örnek: ${report.totalSamples}
- Memory Trendi: ${report.memoryTrend}
- Max Heap: ${report.maxHeapUsed}MB
- Min Heap: ${report.minHeapUsed}MB
- Ortalama Heap: ${report.averageHeapUsed}MB

🛣️ Route Analizi:
${JSON.stringify(report.routeAnalysis, null, 2)}
    `);

    return report;
  }

  generateRouteReport() {
    const routeReport = {};

    for (const [route, samples] of this.routeMemory.entries()) {
      routeReport[route] = {
        totalRequests: samples.length,
        averageHeapUsed: this.calculateAverage(samples.map(s => s.heapUsed)),
        averageDuration: this.calculateAverage(samples.map(s => s.duration)),
        maxHeapUsed: Math.max(...samples.map(s => s.heapUsed)),
        minHeapUsed: Math.min(...samples.map(s => s.heapUsed)),
        trend: this.calculateRouteTrend(samples)
      };
    }

    return routeReport;
  }

  calculateRouteTrend(samples) {
    if (samples.length < 2) return "Yetersiz veri";

    const firstSample = samples[0].heapUsed;
    const lastSample = samples[samples.length - 1].heapUsed;
    const trend = ((lastSample - firstSample) / firstSample) * 100;

    return `${trend.toFixed(2)}% ${trend > 0 ? 'artış' : 'azalış'}`;
  }

  calculateMemoryTrend() {
    if (this.samples.length < 2) return "Yetersiz veri";

    const firstSample = this.samples[0].heapUsed;
    const lastSample = this.samples[this.samples.length - 1].heapUsed;
    const trend = ((lastSample - firstSample) / firstSample) * 100;

    return `${trend.toFixed(2)}% ${trend > 0 ? 'artış' : 'azalış'}`;
  }

  calculateAverage(numbers) {
    return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length);
  }
}

module.exports = MemoryProfiler;
