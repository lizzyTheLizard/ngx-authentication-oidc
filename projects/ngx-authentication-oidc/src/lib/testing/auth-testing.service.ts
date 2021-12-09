import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { LoginResult, UserInfo } from '../oidc/login-result';

@Injectable()
export class AuthTestingService {
  public readonly isLoggedIn$: Observable<boolean>;
  public readonly userInfo$: Observable<UserInfo | undefined>;
  public readonly initialSetupFinished$: Promise<boolean>;
  private readonly loginResult$: BehaviorSubject<LoginResult>;
  private initialSetupFinishedResolve: (e: any) => void = () => {};

  constructor(){
    //Set up initialSetupFinished promise
    this.initialSetupFinished$ = new Promise((resolve) => {
      this.initialSetupFinishedResolve = resolve;
    });

    //Set up Observables
    this.loginResult$ = new BehaviorSubject<LoginResult>({isLoggedIn: false});
    this.isLoggedIn$ = this.loginResult$.pipe(map(t => t.isLoggedIn));
    this.userInfo$ = this.loginResult$.pipe(map(t => t.userInfo));
  }

  public async fakeLogin(loginResult: LoginResult) {
    this.loginResult$.next(loginResult);
  }

  public async fakeLogout() {
    this.loginResult$.next({isLoggedIn: false});
  }

  public async initialize() {
    this.initialSetupFinishedResolve(true);
  }

  public async login(): Promise<boolean> {
    //Nothing to do here
    return true;
  }

  public async silentLogin(): Promise<boolean> {
    //Nothing to do here
    return true;
  }

  public async logout(): Promise<void>{
    //Nothing to do here
  }

  public getAccessToken(): string | undefined {
    return this.loginResult$.value.accessToken;
  }

  public getIdToken(): string | undefined {
    return this.loginResult$.value.idToken;
  }

  public isLoggedIn(): boolean {
    return this.loginResult$.value.isLoggedIn;
  }

  public getUserInfo(): UserInfo | undefined {
    return this.loginResult$.value.userInfo;
  }
}
