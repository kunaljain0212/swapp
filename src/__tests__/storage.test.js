// Import the Storage class
import { Storage } from '../modules/storage';

// Create a new instance of Storage for testing
const storage = new Storage('testDB');

describe('Storage', () => {
  beforeAll(async () => {
    // Initialize the Storage instance before running tests
    await storage.ready;
  });

  afterAll(() => {
    // Clean up after all tests are done
    storage.delete();
  });

  test('Initialization', async () => {
    // Check if the Storage instance is properly initialized
    expect(storage.dbName).toBe('testDB');
    expect(storage.db).not.toBeNull();
  });

  test('Create Table', async () => {
    // Create a table and check if it exists in the database
    await storage.createTable('testTable', 'id', ['column1', 'column2']);
    expect(storage.db.objectStoreNames.contains('testTable')).toBe(true);
  });

  test('Set and Get Data', async () => {
    // Set data and then retrieve it to check if it matches
    const key = 'key1';
    const value = { data: 'value1' };
    await storage.set(key, value);
    const retrievedValue = await storage.get(key);
    expect(retrievedValue).toEqual(value);
  });

  test('Upgrade Database', async () => {
    // Upgrade the database and check if the new table is created
    await storage.upgradeDatabase('newTable', 'id', ['column1']);
    expect(storage.db.objectStoreNames.contains('newTable')).toBe(true);
  });

  test('Delete Database', () => {
    // Check if the database is deleted successfully
    storage.delete();
    expect(indexedDB.databases().length).toBe(0);
  });

  test('Add and Get Data with Transactions', async () => {
    // Add data within a transaction and then retrieve it to check if it matches
    const key = 'key2';
    const value = { data: 'value2' };

    // Start a transaction
    const transaction = storage.db.transaction(['testTable'], 'readwrite');
    const objectStore = transaction.objectStore('testTable');

    // Add data within the transaction
    objectStore.add(value, key);

    // Complete the transaction
    await new Promise((resolve) => (transaction.oncomplete = resolve));

    // Retrieve data and check if it matches
    const retrievedValue = await storage.get(key);
    expect(retrievedValue).toEqual(value);
  });

  test('Update Data', async () => {
    // Update existing data and then retrieve it to check if it's updated
    const key = 'key1';
    const updatedValue = { data: 'updatedValue' };
    await storage.set(key, updatedValue);
    const retrievedValue = await storage.get(key);
    expect(retrievedValue).toEqual(updatedValue);
  });

  test('Delete Data', async () => {
    // Delete data and then check if it's removed from the database
    const key = 'key1';
    await storage.delete(key);
    const retrievedValue = await storage.get(key);
    expect(retrievedValue).toBeUndefined();
  });

  test('Clear Table', async () => {
    // Clear the entire table and check if it's empty
    await storage.clearTable('testTable');
    const transaction = storage.db.transaction(['testTable'], 'readonly');
    const objectStore = transaction.objectStore('testTable');
    const countRequest = objectStore.count();

    await new Promise((resolve) => {
      countRequest.onsuccess = () => {
        resolve(countRequest.result);
      };
    });

    expect(countRequest.result).toBe(0);
  });
});
