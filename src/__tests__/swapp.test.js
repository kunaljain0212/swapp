// Import the functions from your file
import { fProto, swapp } from '../modules/swapp';

// Test cases for fProto function
describe('fProto', () => {
  test('Initialization', () => {
    const fObject = new fProto();
    expect(fObject.getDecision()).toBe('dirty');
    expect(fObject.getMetadata()).toEqual({});
    expect(fObject.getHeaders()).toEqual({});
    expect(fObject.getBody()).toBe('');
  });

  test('Update Metadata', () => {
    const fObject = new fProto();
    const update = {
      cache: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'value' }),
    };
    fObject.updateMeta(update);
    expect(fObject.getMetadata().cache).toBe(true);
    expect(fObject.getMetadata().headers['Content-Type']).toBe(
      'application/json'
    );
    expect(fObject.getBody()).toBe(JSON.stringify({ key: 'value' }));
  });
});

// Test cases for swapp function
describe('swapp', () => {
  let swappInstance;

  beforeEach(() => {
    swappInstance = new swapp();
  });

  test('Initialization', () => {
    expect(swappInstance.apps).toEqual([]);
    expect(swappInstance.reqOrder).toEqual([]);
    expect(swappInstance.respOrder).toEqual([]);
    expect(swappInstance.tcbOrder).toEqual([]);
    expect(swappInstance.secret.length).toBe(128);
    expect(swappInstance.msgChannel).toEqual([]);
  });

  test('Adding App', () => {
    const app = { appname: 'TestApp' };
    swappInstance.addApp(app);
    expect(swappInstance.apps).toContain(app);
  });

  test('Activation', () => {
    // Mock the onswactivate function for apps
    const mockFn = jest.fn();
    const app = { appname: 'TestApp', onswactivate: mockFn };
    swappInstance.addApp(app);

    swappInstance.activateSupervisor();

    expect(mockFn).toHaveBeenCalled();
  });

  test('Message Manager', () => {
    // Mock a message event
    const mockEvent = {
      data: {
        label: ['testLabel'],
        msg: 'Test Message',
        secret: swappInstance.secret,
      },
      ports: [{}], // Mock the ports array
    };

    // Mock a message handler for an app
    const mockHandler = jest.fn();
    const app = {
      appname: 'TestApp',
      msgLabel: ['testLabel'],
      msgHandler: mockHandler,
    };
    swappInstance.addApp(app);

    swappInstance.messageManager(mockEvent);

    expect(mockHandler).toHaveBeenCalledWith(['testLabel'], 'Test Message');
  });

  test('Broadcast Message', () => {
    // Mock a message channel
    const mockChannel = { postMessage: jest.fn() };
    swappInstance.msgChannel.push(mockChannel);

    swappInstance.broadcastMsg(['testLabel'], 'Test Message');

    expect(mockChannel.postMessage).toHaveBeenCalledWith({
      label: ['testLabel'],
      msg: 'Test Message',
      secret: swappInstance.secret,
    });
  });
});
