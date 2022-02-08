import { Inject, Injectable } from "@angular/core";
import { TokenStoreToken } from "../authentication-module";
import { LoginResult } from "../login-result";
import { TokenStore } from "./token-store";

const prefix: string = "auth.";

@Injectable()
export class TokenStoreWrapper {
  constructor(
    @Inject(TokenStoreToken) private readonly tokenStore: TokenStore) {}

  public getString(name: string) : string | undefined {
    return this.tokenStore.getItem(prefix + name) ?? undefined;
  }

  public getObject<T>(name: string) : T | undefined {
    const str = this.getString(name);
    return str ? JSON.parse(str): undefined;
  }
    
  public setObject<T>(name: string, item: T | undefined): void {
    const str = item ? JSON.stringify(item) : undefined;
    this.setString(name, str);
  }

  public setString(name: string, item: string | undefined): void {
    if(item) {
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
    this.tokenStore.removeItem(prefix + 'nonce');
  }
    
  public writeTokenStore(loginResult: LoginResult): void {
    this.setObject('isLoggedIn', loginResult.isLoggedIn);
    this.setString('accessToken', loginResult.accessToken);
    this.setString('idToken', loginResult.idToken);
    this.setObject('userInfo', loginResult.userInfo);
    this.setObject('sessionState', loginResult.sessionState);
  }
    
  public readTokenStore(): LoginResult {
    return {
      isLoggedIn: this.getObject('isLoggedIn') ?? false,
      idToken: this.getString('idToken'),
      accessToken: this.getString('accessToken'),
      userInfo: this.getObject('userInfo'),
      sessionState: this.getObject('sessionState')
    }
  }   
}
