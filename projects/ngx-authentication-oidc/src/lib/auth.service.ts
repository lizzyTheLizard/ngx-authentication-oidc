import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { map, Observable, Subject } from 'rxjs';
import { AuthConfigService } from './auth-config.service';
import { LoginOptions } from './configuration/login-options';
import { InitializerInput } from './initializer/initializer';
import { Logger } from './logger/logger';
import { LoginResult, OidcService, UserInfo } from './oidc/oidc.service';

@Injectable()
export class AuthService {
  private readonly logger: Logger;
  private readonly loginResult$: Subject<LoginResult>;
  public readonly isLoggedIn$: Observable<boolean>;
  public readonly userInfo$: Observable<UserInfo | undefined>;
  public readonly initialSetupFinished$: Promise<boolean>;
  private initialSetupFinishedResolve: (e: any) => void = () => {};

  constructor(
    private readonly oidcService: OidcService ,
    private readonly authConfigService: AuthConfigService, 
    private readonly router: Router) {
    this.logger = authConfigService.loggerFactory('AuthService');

    //Set up initialSetupFinished promise
    this.initialSetupFinished$ = new Promise((resolve) => {
      this.initialSetupFinishedResolve = resolve;
    });

    //Set up Observables
    this.loginResult$ = new Subject();
    this.isLoggedIn$ = this.loginResult$.pipe(map(t => t.isLoggedIn));
    this.userInfo$ = this.loginResult$.pipe(map(t => t.userInfo));
  }

  public async initialize() {
    try {
      this.logger.debug('Start authentication module');
      const initialLoginResult = this.authConfigService.tokenStore.readTokenStore() ?? { isLoggedIn: false}
      await this.oidcService.initialize();
      const initializerInput: InitializerInput ={
        ...this.authConfigService,
        initialLoginResult: initialLoginResult,
        oidcService: this.oidcService,
      };
      const loginResult = await this.authConfigService.initializer(initializerInput);
      if(loginResult.isLoggedIn) {
        this.handleSuccessfulLoginResult(loginResult);
      }
      this.logger.info('Finished initialization of authentication module, user is ' + (!loginResult.isLoggedIn ? "not " : "") + " logged in");
      this.initialSetupFinishedResolve(true);
    } catch (e) {
      this.logger.error('Could not initialize authentication module', e);
      this.router.navigateByUrl(this.authConfigService.errorUrl);
      this.initialSetupFinishedResolve(true);
    }
  }

  public async login(loginOptions: LoginOptions = {}): Promise<boolean> {
    const finalUrl = loginOptions.finalUrl ?? this.router.url;
    const loginResult = await this.oidcService.login({...loginOptions, finalUrl: finalUrl});
    if(!loginResult.isLoggedIn) {
      this.logger.info('Login was not successful, user is not logged in')
      return false;
    }
    this.handleSuccessfulLoginResult(loginResult);
    return true;
  }

  public async silentLogin(loginOptions: LoginOptions = {}): Promise<boolean> {
    const loginResult = await this.oidcService.silentLogin(loginOptions);
    if(!loginResult.isLoggedIn) {
      this.logger.info('Login was not successful, user is not logged in')
      return false;
    }
    this.handleSuccessfulLoginResult(loginResult);
    return true;
  }

  private handleSuccessfulLoginResult(loginResult: LoginResult): void{
    this.authConfigService.tokenStore.writeTokenStore(loginResult);
    this.loginResult$.next(loginResult);
    this.authConfigService.sessionHandler.startWatching();
    const userInfo = this.getUserInfo();
    this.logger.info('Login was successful, user is logged in', userInfo);
    if(loginResult.redirectPath) {
      this.router.navigateByUrl(loginResult.redirectPath);
    }
  }

  public async logout(): Promise<void>{
    await this.initialSetupFinished$;
    if(!this.isLoggedIn()) {
      this.logger.info('No logout is started as user is already logged in')
      return;
    }
    const userInfo = this.getUserInfo();
    this.logger.info('Log out user', userInfo)
    await this.oidcService.logout();
    const token = {isLoggedIn: false};
    this.authConfigService.tokenStore.cleanTokenStore();
    this.loginResult$.next(token)
    this.authConfigService.sessionHandler.stopWatching();
    if(this.authConfigService.logoutUrl) {
      this.logger.info('Redirect to', this.authConfigService.logoutUrl)
      this.router.navigateByUrl(this.authConfigService.logoutUrl);
    } else {
      this.logger.debug('Logged out, but no redirect URI is specified')
    }
  }

  public getAccessToken(): string | undefined {
    return this.authConfigService.tokenStore.getString("accessToken");
  }

  public getIdToken(): string | undefined {
    return this.authConfigService.tokenStore.getString("idToken");
  }

  public isLoggedIn(): boolean {
    return this.authConfigService.tokenStore.getObject("isLoggedIn") ?? false;
  }

  public getUserInfo(): UserInfo | undefined {
    return this.authConfigService.tokenStore.getObject("userInfo");
  }
  
}
