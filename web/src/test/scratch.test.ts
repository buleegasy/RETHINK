import { test } from 'vitest';
test('what is localStorage', () => {
  console.log('proto:', Object.getPrototypeOf(localStorage));
  console.log('JSON:', JSON.stringify(localStorage));
  console.log('keys:', Reflect.ownKeys(localStorage));
});
