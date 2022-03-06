import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { AuthService, SessionService, UserInfo } from 'ngx-authentication-oidc';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-private',
  templateUrl: './private.page.html',
  styleUrls: ['./private.page.css'],
})
export class PrivatePage implements OnInit {
  public userInfo$: Observable<UserInfo | undefined>;
  public logoutWarning$: Observable<number | undefined>;

  constructor(
    private readonly httpClient: HttpClient,
    sessionService: SessionService,
    authService: AuthService
  ) {
    this.userInfo$ = authService.userInfo$;
    this.logoutWarning$ = sessionService.secondsUntilTimeout$;
  }

  ngOnInit(): void {}

  public makeRequest() {
    this.httpClient
      .get('http://localhost:3000/info')
      .subscribe((x) => alert(JSON.stringify(x)));
  }

  public makeRequestWithout() {
    this.httpClient
      .get<any>('https://v2.jokeapi.dev/joke/Any?type=single')
      .subscribe((x) => alert(x.joke));
  }
}
