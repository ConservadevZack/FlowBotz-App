// Service Worker Cleanup Script
// This unregisters any existing service workers that might be caching old content

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    console.log("Checking for existing service workers...");
    
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      if (registrations.length === 0) {
        console.log("No service workers found");
        return;
      }
      
      console.log(`Found ${registrations.length} service worker(s), unregistering...`);
      
      for (let registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log("Service worker unregistered successfully");
          } else {
            console.log("Service worker unregister failed");
          }
        }).catch((error) => {
          console.error("Error unregistering service worker:", error);
        });
      }
    }).catch((error) => {
      console.error("Error getting service worker registrations:", error);
    });
  });
}

// Also clear any cached chunks that might be stale
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    if (cacheNames.length > 0) {
      console.log(`Found ${cacheNames.length} cache(s), clearing...`);
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log(`Deleting cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    }
  }).then(() => {
    console.log("All caches cleared");
  }).catch(error => {
    console.error("Error clearing caches:", error);
  });
}