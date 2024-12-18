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
  // Route profiling başlat
  const routeProfiler = profiler.startRouteProfiler(request.nextUrl.pathname);

  // Response tamamlandığında
  request.nextUrl.searchParams.forEach(() => {
    // Profiling'i sonlandır
    routeProfiler.end();
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
    // Route profiling başlat
    const routeProfiler = profiler.startRouteProfiler(`/pages/${params.slug}`);

    // Component unmount olduğunda profiling'i sonlandır
    return () => {
      routeProfiler.end();
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

## Önemli Notlar

1. **Server-Side Kullanım**:
   - Bu paket sadece server-side'da çalışır
   - Client-side'da kullanılırsa uyarı verir ve işlem yapmaz

2. **Otomatik Temizlik**:
   - Uygulama kapatıldığında (SIGINT/SIGTERM) profiler otomatik olarak durur
   - Son rapor otomatik olarak oluşturulur

3. **Hata Yönetimi**:
   - Tüm kritik operasyonlar try-catch ile korunur
   - Hata durumunda uygun fallback değerler kullanılır

## Hata Ayıklama

Memory leak tespit edildiğinde:

1. `memory-profile.log` dosyasını kontrol edin
2. Hangi route'da leak tespit edildiğini belirleyin
3. İlgili route'un component'lerini ve data fetching logic'ini gözden geçirin
4. Memory-report.json'daki trend analizini inceleyin

## Lisans

MIT
