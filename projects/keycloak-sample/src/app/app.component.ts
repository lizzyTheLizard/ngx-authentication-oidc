import { Component } from '@angular/core';
import { AuthService } from 'ngx-authentication-oidc';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'keycloak-sample';
  constructor(readonly auth: AuthService){
    
  }
}
