import { Injectable } from '@angular/core';
import { AuthConfigService } from '../auth-config.service';
import { LoginResult, UserInfo } from '../login-result';

const prefix: string = 'auth.';

@Injectable()
export class TokenStoreWrapper {
  private readonly tokenStore: Storage;

  constructor(private readonly config: AuthConfigService) {
    this.tokenStore = config.tokenStore;
  }

  public getLoginResult(): LoginResult {
    const result: LoginResult = {
      isLoggedIn: this.getObject('isLoggedIn') ?? false
    };
    const idToken = this.getString('idToken');
    if (idToken) {
      result.idToken = idToken;
    }
    const accessToken = this.getString('accessToken');
    if (accessToken) {
      result.accessToken = accessToken;
    }
    const sessionState = this.getString('sessionState');
    if (sessionState) {
      result.sessionState = sessionState;
    }
    const refreshToken = this.getString('refreshToken');
    if (refreshToken) {
      result.refreshToken = refreshToken;
    }
    const userInfo = this.getObject<UserInfo>('userInfo');
    if (userInfo) {
      result.userInfo = userInfo;
    }
    const expiresAt = this.getDate('expiresAt');
    if (expiresAt) {
      result.expiresAt = expiresAt;
    }
    return result;
  }

  public setLoginResult(loginResult: LoginResult): void {
    this.setObject('isLoggedIn', loginResult.isLoggedIn);
    this.setString('accessToken', loginResult.accessToken);
    this.setString('idToken', loginResult.idToken);
    this.setObject('userInfo', loginResult.userInfo);
    this.setString('sessionState', loginResult.sessionState);
    this.setDate('expiresAt', loginResult.expiresAt);
    this.setString('refreshToken', loginResult.refreshToken);
  }

  saveNonce(nonce: string) {
    this.setString('nonce', nonce);
  }
  getStoredNonce(): string | undefined {
    return this.getString('nonce');
  }

  public cleanTokenStore(): void {
    this.tokenStore.removeItem(prefix + 'isLoggedIn');
    this.tokenStore.removeItem(prefix + 'accessToken');
    this.tokenStore.removeItem(prefix + 'idToken');
    this.tokenStore.removeItem(prefix + 'userInfo');
    this.tokenStore.removeItem(prefix + 'sessionState');
    this.tokenStore.removeItem(prefix + 'expiresAt');
    this.tokenStore.removeItem(prefix + 'refreshToken');
    this.tokenStore.removeItem(prefix + 'nonce');
  }

  private setObject<T>(name: string, item: T | undefined): void {
    const str = item ? JSON.stringify(item) : undefined;
    this.setString(name, str);
  }

  private setDate(name: string, item: Date | undefined): void {
    const str = item ? item.toISOString() : undefined;
    this.setString(name, str);
  }

  private setString(name: string, item: string | undefined): void {
    if (item) {
      this.tokenStore.setItem(prefix + name, item);
    } else {
      this.tokenStore.removeItem(prefix + name);
    }
  }

  private getString(name: string): string | undefined {
    return this.tokenStore.getItem(prefix + name) ?? undefined;
  }

  private getObject<T>(name: string): T | undefined {
    const str = this.getString(name);
    return str ? JSON.parse(str) : undefined;
  }

  private getDate(name: string): Date | undefined {
    const str = this.getString(name);
    return str ? new Date(str) : undefined;
  }
}
