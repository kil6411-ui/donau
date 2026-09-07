/* 돈암1동 이웃살핌 — 오프라인 캐시
   ※ 자원 정보를 고친 뒤에는 아래 VERSION 숫자를 꼭 올리세요.
     안 올리면 주민 휴대폰에 예전 내용이 계속 남습니다. */
const VERSION = "v12";
const CACHE = "donam1-" + VERSION;

/* 인터넷 없이도 떠야 하는 파일들 */
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  /* 카카오맵·글꼴 같은 외부 자원은 건드리지 않습니다.
     (인터넷이 없으면 지도만 안 뜨고 전화번호는 그대로 보입니다) */
  if (new URL(req.url).origin !== location.origin) return;

  /* 화면은 새 내용 우선, 안 되면 캐시 */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  /* 나머지는 캐시 우선 */
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }))
  );
});
