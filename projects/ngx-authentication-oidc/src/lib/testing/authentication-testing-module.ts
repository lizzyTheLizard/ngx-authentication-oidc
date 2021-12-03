import { NgModule } from '@angular/core';
import { AuthService } from '../auth.service';
import { AuthTestingService } from './auth-testing.service';


const authTestingService = new AuthTestingService();

@NgModule({
  providers: [
    { provide: AuthService, useValue: authTestingService},
    { provide: AuthTestingService, useValue: authTestingService}
  ],
})
export class AuthenticationTestingModule {
}
