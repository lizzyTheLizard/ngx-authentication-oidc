import { InjectionToken } from '@angular/core';

export const TokenStoreToken = new InjectionToken('TokenStore');
export interface TokenStore {
  setItem(name: string, obj: string): void;

  getItem(name: string): string | null;

  removeItem(name: string): void;
}
