// SIGEO-ZKAT — Service Worker
// Tujuan: setelah aplikasi dibuka SATU KALI saat online, halaman + library
// yang dibutuhkan tersimpan di HP, sehingga aplikasi tetap bisa DIBUKA
// meski tidak ada sinyal sama sekali. Permintaan data ke Google Apps Script
// TIDAK di-cache — itu tetap butuh internet saat menyimpan/memuat data,
// sesuai penjelasan di aplikasi.

var CACHE_NAME = "sigeo-zkat-shell-v1";
var SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return Promise.all(
        SHELL_FILES.map(function (url) {
          return fetch(url, { mode: "no-cors" })
            .then(function (res) { return cache.put(url, res); })
            .catch(function () { /* biarkan gagal diam-diam jika satu file tak terjangkau saat install */ });
        })
      );
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var url = event.request.url;

  // Jangan pernah menyentuh permintaan ke Google Apps Script — itu harus
  // selalu lewat jaringan langsung (data harus real-time, bukan cache).
  if (url.indexOf("script.google.com") !== -1) {
    return; // biarkan browser menangani seperti biasa
  }

  // App shell & library: cache-first, dengan fallback ke jaringan lalu
  // memperbarui cache untuk kunjungan berikutnya.
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (res) {
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, resClone); });
        return res;
      }).catch(function () {
        // Offline dan belum ada di cache — untuk navigasi halaman utama,
        // coba sajikan index.html dari cache sebagai fallback terakhir.
        if (event.request.mode === "navigate") return caches.match("./index.html");
      });
    })
  );
});
