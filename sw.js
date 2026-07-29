/**
 * MCQ 서비스워커.
 *
 * 예전에는 모든 요청을 캐시 우선(cache-first)으로 처리했다. 그러면 HTML을
 * 새로 배포해도 캐시에 든 옛 화면이 계속 나온다 — CACHE 이름을 올리지 않는 한
 * 영영 갱신되지 않는다. 실제로 과목선택 화면을 없앤 뒤에도 방문자에게는
 * 옛 화면이 그대로 보였다.
 *
 * 그래서 **문서(navigate) 요청은 네트워크 우선**으로 바꿨다. 오프라인일 때만
 * 캐시가 답한다. 나머지 자산은 캐시 우선을 유지한다 — 잘 바뀌지 않기 때문이다.
 */
const CACHE = 'ox-quiz-v3';
const ASSETS = [
  '/MCQ/',
  '/MCQ/index.html',
  '/MCQ/criminal.html',
  '/MCQ/public-law.html',
  '/MCQ/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.url.includes('.mp4')) return;      // 배경영상은 캐시하지 않는다(용량)

  // 문서는 네트워크 우선 — 배포한 화면이 바로 보여야 한다.
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match(req).then(c => c || caches.match('/MCQ/')))
    );
    return;
  }

  // 그 밖의 자산은 캐시 우선.
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match('/MCQ/'));
    })
  );
});
