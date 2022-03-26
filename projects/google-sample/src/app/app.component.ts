import { Component } from '@angular/core';
import { AuthService } from 'ngx-authentication-oidc';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'google-sample';
  constructor(readonly auth: AuthService) {}

  login() {
    this.auth.login();
  }
}
