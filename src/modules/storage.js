class Storage {
  constructor(dbName) {
    this.dbName = dbName;
    this.db = null;
    this.ready = this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        db.createObjectStore('store');
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onerror = (event) => {
        reject(event.error);
      };
    });
  }

  async get(key) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const request = this.getStore().get(key);
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.error);
    });
  }

  async createTable(name, key, columns) {
    await this.ready;
    if (!this.db.objectStoreNames.contains(name)) {
      this.db.close();
      await this.upgradeDatabase(name, key, columns);
    }
  }

  async upgradeDatabase(name, key, columns) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.db.version + 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const store = db.createObjectStore(name, { keyPath: key });
        for (const column of columns) {
          store.createIndex(column, column, { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onerror = (event) => {
        reject(event.error);
      };
    });
  }

  getStore() {
    return this.db.transaction(['store'], 'readwrite').objectStore('store');
  }

  async set(key, value) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const request = this.getStore().put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.error);
    });
  }

  delete() {
    indexedDB.deleteDatabase(this.dbName);
  }
}

export const storage = new Storage('SWAPP');
