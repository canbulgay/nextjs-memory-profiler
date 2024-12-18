# nextjs-memory-profiler

Next.js uygulamalarında memory leak tespiti ve memory profiling için geliştirilmiş bir araç.

## Kurulum

```bash
npm install nextjs-memory-profiler
```

## Hızlı Başlangıç

Next.js uygulamanızda memory leak tespiti için iki farklı yaklaşım kullanabilirsiniz:

### 1. Middleware ile Kullanım

`middleware.ts` dosyanızda:

```javascript
import MemoryProfiler from 'nextjs-memory-profiler';

const profiler = new MemoryProfiler({
  threshold: 50, // 50MB üzeri artışlarda uyarı ver
});

// Profiler'ı başlat
profiler.start();

export function middleware(request) {
  const start = process.hrtime();
  const initialMemory = process.memoryUsage();

  request.nextUrl.searchParams.forEach(() => {
    const diff = process.hrtime(start);
    const finalMemory = process.memoryUsage();

    const memoryDiff = {
      heapUsed: Math.round(
        (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024
      ),
      duration: diff[0] * 1000 + diff[1] / 1000000,
    };

    profiler.recordRouteMemory(request.nextUrl.pathname, memoryDiff);
  });
}
```

### 2. Sayfa Bileşeni ile Kullanım

Herhangi bir page component'inizde:

```javascript
'use client';

import { useEffect } from 'react';
import MemoryProfiler from 'nextjs-memory-profiler';

const profiler = new MemoryProfiler({
  threshold: 50
});

export default function Page({ params }) {
  useEffect(() => {
    const startMemory = process.memoryUsage();
    const startTime = performance.now();

    return () => {
      const endMemory = process.memoryUsage();
      const duration = performance.now() - startTime;

      const memoryDiff = {
        heapUsed: Math.round(
          (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024
        ),
        duration,
      };

      profiler.recordRouteMemory(`/pages/${params.slug}`, memoryDiff);
    };
  }, [params.slug]);

  return <div>{/* Sayfa içeriği */}</div>;
}
```

## Raporlar ve Çıktılar

Profiler iki tür çıktı üretir:

1. **memory-profile.log**: 
   - Anlık uyarılar
   - Memory leak tespitleri
   - Yüksek memory kullanım uyarıları

2. **memory-report.json**:
   - Route bazlı analiz
   - Memory kullanım trendleri
   - Her route için:
     - Toplam istek sayısı
     - Ortalama memory kullanımı
     - İşlem süreleri
     - Memory artış/azalış trendi

## Konfigürasyon

```javascript
const profiler = new MemoryProfiler({
  interval: 5000,    // Memory ölçüm aralığı (ms)
  threshold: 50      // Memory leak uyarı eşiği (MB)
});
```

| Seçenek | Açıklama | Varsayılan |
|---------|-----------|------------|
| interval | Ölçüm aralığı (ms) | 5000 |
| threshold | Memory artış eşiği (MB) | 100 |

## Proje Yapısı

```
nextjs-memory-profiler/
├── src/
│   ├── memoryProfiler.js    # Ana profiler sınıfı
│   └── middleware.js        # Middleware implementasyonu
├── examples/
│   ├── app-router-example.js    # App Router örneği
│   └── page-component-example.js # Page component örneği
└── package.json
```

## Memory Leak Tespiti

Profiler şu durumlarda uyarı verir:

1. **Route Bazlı Memory Leak**:
   - Aynı route'a yapılan ardışık isteklerde memory kullanımı eşik değerini aşarsa

2. **Genel Memory Kullanımı**:
   - Toplam heap kullanımı limit değerinin %80'ini aşarsa
   - Belirli bir süre içinde anormal memory artışı tespit edilirse

## Performans İzleme

Her route için şu metrikler izlenir:
- Memory kullanımı (MB)
- İşlem süresi (ms)
- Memory kullanım trendi
- Maksimum ve minimum memory kullanımı

## Hata Ayıklama

Memory leak tespit edildiğinde:

1. `memory-profile.log` dosyasını kontrol edin
2. Hangi route'da leak tespit edildiğini belirleyin
3. İlgili route'un component'lerini ve data fetching logic'ini gözden geçirin
4. Memory-report.json'daki trend analizini inceleyin

## Lisans

MIT
