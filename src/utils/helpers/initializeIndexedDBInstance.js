export const initializeIndexedDBInstance = (item, idb) => {
  //check for support
  if (!idb) {
    console.log("This browser doesn't support IndexedDB");
    return;
  }

  const request = idb.open('SWAPP', 1);

  request.onerror = function (event) {
    console.error('An error occurred with IndexedDB');
    console.error(event);
  };

  request.onupgradeneeded = function (event) {
    console.log(event);
    const db = request.result;

    if (!db.objectStoreNames.contains('dataGuard')) {
      db.createObjectStore('dataGuard', { keyPath: 'id' });
    }
  };

  request.onsuccess = function () {
    console.log('Database opened successfully');

    const db = request.result;

    var tx = db.transaction('dataGuard', 'readwrite');
    var dataGuard = tx.objectStore('dataGuard');

    dataGuard.add(item);

    return tx.complete;
  };
};
