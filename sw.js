/**
 * Service Worker for 모둠 뽑기 PWA
 * 오프라인 지원 및 캐싱 전략
 */

const CACHE_NAME = 'class-group-manager-v2';
const STATIC_CACHE = 'static-v2';

// 캐시할 정적 리소스
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/store.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-maskable.svg'
];

// 외부 리소스 (CDN)
const EXTERNAL_ASSETS = [
  'https://cdn.tailwindcss.com'
];

// 설치 이벤트 - 정적 자산 캐싱
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        // 정적 파일만 먼저 캐시 (실패해도 설치 진행)
        return cache.addAll(STATIC_ASSETS.filter(url => !url.includes('icon')))
          .catch(err => console.log('[SW] Some assets failed to cache:', err));
      })
      .then(() => self.skipWaiting())
  );
});

// 활성화 이벤트 - 오래된 캐시 삭제
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== STATIC_CACHE && name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch 이벤트 - 캐시 우선 전략 (네트워크 폴백)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // CDN 요청은 네트워크 우선
  if (EXTERNAL_ASSETS.some(asset => request.url.includes(asset))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 같은 오리진의 요청은 캐시 우선
  if (url.origin === location.origin) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 그 외 요청은 네트워크 우선
  event.respondWith(networkFirst(request));
});

// 캐시 우선 전략
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // 백그라운드에서 캐시 갱신
    updateCache(request);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    // 성공적인 응답만 캐시
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // 오프라인 폴백
    return caches.match('./index.html');
  }
}

// 네트워크 우선 전략
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    // 성공적인 응답만 캐시
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // 오프라인 폴백
    return caches.match('./index.html');
  }
}

// 백그라운드 캐시 갱신
async function updateCache(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    // 네트워크 오류 무시 (오프라인 상태)
  }
}

// 푸시 알림 이벤트 (향후 확장용)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();

    const options = {
      body: data.body || '새 알림이 있습니다',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      vibrate: [100, 50, 100],
      data: data.data || {}
    };

    event.waitUntil(
      self.registration.showNotification(data.title || '모둠 뽑기', options)
    );
  }
});

// 알림 클릭 이벤트
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});
