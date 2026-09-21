/* eslint-env jest */
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('react-native-tcp-socket', () => ({
  createConnection: jest.fn(() => ({
    on: jest.fn(),
    write: jest.fn(),
    destroy: jest.fn(),
  })),
}));

jest.mock('react-native-bluetooth-classic', () => ({
  getBondedDevices: jest.fn().mockResolvedValue([]),
  connectToDevice: jest.fn().mockResolvedValue({
    onDataReceived: jest.fn(() => ({ remove: jest.fn() })),
    write: jest.fn(),
  }),
  disconnectFromDevice: jest.fn(),
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockqr'),
}));
