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

  constructor(sessionService: SessionService, authService: AuthService) {
    this.userInfo$ = authService.userInfo$;
    this.logoutWarning$ = sessionService.secondsUntilTimeout$;
  }

  ngOnInit(): void {}
}
