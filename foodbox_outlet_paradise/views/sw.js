'use strict'

var cacheName = 'dcreation';
var filesToCache = [
    './',
    './index.html',
    './styles/style.css',
    './routes/index.js',    
    'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css',
    'https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js',
    'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js'
];

self.addEventListener('install', function(e) {
    console.log('[serviceWorker] installed');
    e.waitUntil(

        caches.open(cacheName).then(function(cache) {
            
            return addAll(filesToCache);
        })
    );
})
self.addEventListener('activate', function(e) {
    console.log('[serviceWorker] activated');
    e.waitUntil(
        caches.keys().then(function(keyList) {
            return Promise.all(keyList.map(function(key) {
                if(key !== cacheName && key !== dataCacheName) {
                    return caches.delete(key);
                }
            }));
        })
    );
});
self.addEventListener('fetch', function(e) {
    console.log('[serviceWorker] fetch', e.request.url);
    e.respondWith(
        caches.match(e.request).then(function(response) {
            return response || fetch(e.request);
        })       
    );
});