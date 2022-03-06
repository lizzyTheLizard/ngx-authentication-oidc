import { Component } from '@angular/core';
import { AuthService, Prompt } from 'ngx-authentication-oidc';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'azure-sample';
  constructor(readonly auth: AuthService) {}

  login() {
    this.auth.login({ prompts: Prompt.SELECT_ACCOUNT });
  }
}
