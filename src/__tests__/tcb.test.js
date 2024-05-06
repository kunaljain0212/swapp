import { EStorage, createLabel, getLabels, addFnc } from '../modules/sw';

describe('EStorage', () => {
  let storage;

  beforeEach(() => {
    storage = new EStorage();
  });

  test('Initialization', async () => {
    await expect(storage.ready).resolves.toBeUndefined();
    expect(storage.db).toBeDefined();
  });

  test('Set and Get Data', async () => {
    const key = 'testKey';
    const value = { message: 'testMessage' };
    await storage.set(key, value);
    const retrievedValue = await storage.getStore().get(key);
    expect(retrievedValue).toEqual(value);
  });

  test('Delete Data', async () => {
    const key = 'testKey';
    const value = { message: 'testMessage' };
    await storage.set(key, value);
    await storage.delete(key);
    const retrievedValue = await storage.getStore().get(key);
    expect(retrievedValue).toBeUndefined();
  });
});

describe('createLabel and getLabels', () => {
  test('Creating and Retrieving Labels', async () => {
    const label = 'testLabel';
    createLabel(label);
    const labels = await getLabels();
    expect(labels).toContainEqual(expect.objectContaining({ label: label }));
  });
});

describe('addFnc', () => {
  test('Adding Functions', () => {
    const functionsToAdd = ['f1', { fname: 'f2', sig: ['sig1', 'sig2'] }, 'f3'];
    addFnc(functionsToAdd);
    expect(sList).toContainEqual({ fname: 'f1', sig: [] });
    expect(sList).toContainEqual({ fname: 'f2', sig: ['sig1', 'sig2'] });
    expect(sList).toContainEqual({ fname: 'f3', sig: [] });
  });
});

describe('checkIntegrity', () => {
  test('Checking Integrity with Default Signature', () => {
    addFnc(['console.log']);
    const result = checkIntegrity();
    expect(result.status).toBe(true);
  });

  test('Checking Integrity with Tampered Signature', () => {
    addFnc(['console.log']);
    sList[0].sig = ['fakeSig']; // Simulating a tampered signature
    const result = checkIntegrity();
    expect(result.status).toBe(false);
    expect(result.info).toContain('console.log');
  });
});

describe('sendMsg', () => {
  test('Sending Message with Correct Secret', () => {
    const label = 'testLabel';
    const msg = 'testMessage';
    navigator.serviceWorker.controller.postMessage = jest.fn(); // Mocking postMessage
    sendMsg(label, msg);
    expect(navigator.serviceWorker.controller.postMessage).toHaveBeenCalledWith(
      { label: label, msg: msg, secret: secret },
      [msgChannel.port2]
    );
  });

  test('Sending Message with Incorrect Secret', () => {
    const label = 'testLabel';
    const msg = 'testMessage';
    navigator.serviceWorker.controller.postMessage = jest.fn(); // Mocking postMessage
    const incorrectSecret = 'incorrectSecret';
    sendMsg(label, msg, incorrectSecret);
    expect(navigator.serviceWorker.controller.postMessage).toHaveBeenCalledWith(
      { label: label, msg: msg, secret: incorrectSecret },
      [msgChannel.port2]
    );
  });
});
