import '@testing-library/jest-dom';
const mockStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true, configurable: true });
