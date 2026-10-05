import { describe, it, expect, beforeEach } from 'vitest';
import { parseJwt } from './AuthContext';

// Simple lightweight mock for sessionStorage without adding jsdom dependency
const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

global.sessionStorage = sessionStorageMock;

describe('AuthContext & Session Hydration', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('parseJwt extracts userId, sub (email), and role from valid JWT token payload', () => {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payloadObj = { sub: "student@test.com", userId: 42, role: "USER", exp: 4102444800 };
    const payload = btoa(JSON.stringify(payloadObj));
    const token = `${header}.${payload}.signature`;

    const user = parseJwt(token);
    expect(user).not.toBeNull();
    expect(user.userId).toBe(42);
    expect(user.email).toBe("student@test.com");
    expect(user.role).toBe("USER");
  });

  it('parseJwt returns null for expired or malformed JWT token', () => {
    const expiredPayload = btoa(JSON.stringify({ sub: "old@test.com", userId: 1, role: "USER", exp: 1000000000 }));
    const token = `header.${expiredPayload}.sig`;

    const user = parseJwt(token);
    expect(user).toBeNull();
  });

  it('derives single source of truth from per-tab sessionStorage ht_token on page reload', () => {
    const payloadObj = { sub: "admin@test.com", userId: 99, role: "ADMIN", exp: 4102444800 };
    const payload = btoa(JSON.stringify(payloadObj));
    const token = `hdr.${payload}.sig`;

    sessionStorage.setItem('ht_token', token);

    const reloadedToken = sessionStorage.getItem('ht_token');
    const user = parseJwt(reloadedToken);

    expect(user).toEqual({
      userId: 99,
      email: "admin@test.com",
      role: "ADMIN",
      exp: 4102444800
    });
  });

  it('handles per-tab session removal by returning null user', () => {
    const payloadObj = { sub: "student@test.com", userId: 10, role: "USER", exp: 4102444800 };
    const token = `hdr.${btoa(JSON.stringify(payloadObj))}.sig`;
    sessionStorage.setItem('ht_token', token);

    expect(parseJwt(sessionStorage.getItem('ht_token'))).not.toBeNull();

    sessionStorage.removeItem('ht_token');
    expect(parseJwt(sessionStorage.getItem('ht_token'))).toBeNull();
  });
});
