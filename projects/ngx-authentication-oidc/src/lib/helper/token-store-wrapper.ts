import { Injectable } from '@angular/core';
import { TokenStore } from '../configuration/oauth-config';
import { AuthConfigService } from '../auth-config.service';
import { LoginResult } from './login-result';

const prefix: string = 'auth.';

@Injectable()
export class TokenStoreWrapper {
  private readonly tokenStore: TokenStore;

  constructor(private readonly config: AuthConfigService) {
    this.tokenStore = config.tokenStore;
  }

  public getLoginResult(): LoginResult {
    return {
      isLoggedIn: this.getObject('isLoggedIn') ?? false,
      idToken: this.getString('idToken'),
      accessToken: this.getString('accessToken'),
      userInfo: this.getObject('userInfo'),
      sessionState: this.getString('sessionState'),
      expiresAt: this.getDate('expiresAt'),
      refreshToken: this.getString('refreshToken')
    };
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

  public setLoginResult(loginResult: LoginResult): void {
    this.setObject('isLoggedIn', loginResult.isLoggedIn);
    this.setString('accessToken', loginResult.accessToken);
    this.setString('idToken', loginResult.idToken);
    this.setObject('userInfo', loginResult.userInfo);
    this.setString('sessionState', loginResult.sessionState);
    this.setDate('expiresAt', loginResult.expiresAt);
    this.setString('refreshToken', loginResult.refreshToken);
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

  public cleanTokenStore(): void {
    this.tokenStore.removeItem(prefix + 'isLoggedIn');
    this.tokenStore.removeItem(prefix + 'accessToken');
    this.tokenStore.removeItem(prefix + 'idToken');
    this.tokenStore.removeItem(prefix + 'userInfo');
    this.tokenStore.removeItem(prefix + 'sessionState');
    this.tokenStore.removeItem(prefix + 'expiresAt');
    this.tokenStore.removeItem(prefix + 'refreshToken');
  }
}
