// تثبيت السيرفر ووركر
self.addEventListener('install', (e) => {
    console.log('[Service Worker] Installed');
});

// تفعيل السيرفر ووركر
self.addEventListener('activate', (e) => {
    console.log('[Service Worker] Activated');
});

// التعامل مع طلبات النت
self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request).catch(() => {
            return caches.match(e.request);
        })
    );
});