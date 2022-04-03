# Angular OIDC Authentication
![Build Status](https://github.com/lizzyTheLizard/ngx-authentication-oidc/actions/workflows/test.yml/badge.svg)
[![npm](https://img.shields.io/npm/v/ngx-authentication-oidc.svg)](
https://www.npmjs.com/package/ngx-authentication-oidc)
[![npm](https://img.shields.io/npm/dm/ngx-authentication-oidc.svg)](https://www.npmjs.com/package/ngx-authentication-oidc)
[![npm](https://img.shields.io/npm/l/ngx-authentication-oidc.svg)](https://www.npmjs.com/package/ngx-authentication-oidc)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

ngx-authentication-oidc is a full fledged authentication solution for Angular using OIDC

## Features
The following OIDC features are supported:
* Automatic provider discovery using [OIDC Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html)
* Login using [Authorization Code Flow](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth), [Implicit Flow](https://openid.net/specs/openid-connect-core-1_0.html#ImplicitFlowAuth) and [Hybrid Flow](https://openid.net/specs/openid-connect-core-1_0.html#HybridFlowAuth) including [PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
* Automatic token updates using [refresh tokens](https://openid.net/specs/openid-connect-core-1_0.html#RefreshTokens) or silent login
* [Client initiated logout](https://openid.net/specs/openid-connect-rpinitiated-1_0.html)
* [Session Management](https://openid.net/specs/openid-connect-session-1_0.html)

Additionally this library features:
* Automatic logout after an inactivity timeout
* Automatic session detection at startup using silent logins
* Automatic access token injection for well defined domains
* Pre-Configured [AuthGuards](https://angular.io/api/router/CanActivate)

The library aims to have a simple yet complete interface for those features consisting of and a comprehensive configuration using meaningful default values.

Among others, this library is tested with [Keycloak](https://www.keycloak.org/), [Google Identity](https://developers.google.com/identity/protocols/oauth2/openid-connect) and [Azure AD](https://azure.microsoft.com/en-us/services/active-directory/)

## Installation
The library can be installed using
```sh
npm i angular-oauth2-oidc --save
```

You then have to add the [AuthenticationModule](projects/ngx-authentication-oidc/src/lib/authentication-module.ts) to your own application

```Typescript
import { BrowserModule } from '@angular/platform-browser';
import { AuthenticationModule } from 'ngx-authentication-oidc';

const config = {
  //minimal configuration
  clientId: 'sample-application',
  provider: 'http://localhost:8080/auth/realms/Test-Application',
};

@NgModule({
  imports: [
    HttpClientModule,
    AuthenticationModule.forRoot(config),
    // etc...
  ],
  declarations: [
    AppComponent,
    // etc...
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

After installation, the library is automatically started and the configured initialization code is executed as soon as the application is started, there is nothing else to do.
If you however want to interact with the authentication module in any way, you can inject an instance of [AuthService](projects/ngx-authentication-oidc/src/lib/auth.service.ts) into your angular application.


## Examples
The following examples are provided:
* **[keycloak-sample](../../projects/keycloak-sample/README.md)**: Simple integration using [Keycloak](https://www.keycloak.org/)
* **[azure-sample](../../projects/azure-sample/README.md)**: Simple integration using [Azure AD](https://azure.microsoft.com/en-us/services/active-directory/)
* **[google-sample](../../projects/google-sample/README.md)**: Simple integration using [Google](https://developers.google.com/identity/protocols/oauth2/openid-connect)
* TODO: Full Config Example
* TODO: Okta

## Documentation
### Configuration
TODO: [OauthConfig](src/lib/configuration/oauth-config.ts).

### Initializer
TODO: [Initializer](src/lib/configuration/initializer.ts)

### Login Options
TODO: [LoginOptions](src/lib/configuration/login-options.ts)

### AuthService
TODO: [AuthService](src/lib/auth.service.ts)

### SessionService
TODO: [SessionService](src/lib/session.service.ts) 

### Silent Login
TODO: 

### Testing
TODO: [Testing](src/lib/testing/authentication-testing-module.ts) 
TODO: [Testing](src/lib/testing/auth-testing.service.ts) 
TODO: [Testing](src/lib/testing/session-testing-service.ts) 

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests and documentation as appropriate.

## License
[MIT](LICENSE)