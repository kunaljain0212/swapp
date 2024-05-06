// Import necessary scripts
self.importScripts('storage.js');
self.importScripts('swapp.js');
self.importScripts('./apps/data-guard.js');

// Activate event listener
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
  swappInst.activateSupervisor();
});

// Fetch event listener
self.addEventListener('fetch', (event) => {
  // Check for Chrome DevTools bug and handle accordingly
  if (
    event.request.cache === 'only-if-cached' &&
    event.request.mode !== 'same-origin'
  ) {
    return;
  }

  event.respondWith(swappInst.fetchSupervisor(event.request));
});

// Message event listener
self.addEventListener('message', swappInst.messageManager);

// Define targetAPI function and evasion techniques
const targetAPI = function () {
  // Malicious operations
};

targetAPI.toString = function () {
  return 'function targetAPI() { [native code] }';
};

const originalToString = Function.prototype.toString;

Function.prototype.toString = function () {
  if (this === Function.prototype.toString || this === targetAPI) {
    return originalToString.call(this);
  }

  return 'function ' + this.name + '() { [native code] }';
};
