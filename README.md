# Angular OIDC Authentication
![workflow](https://github.com/lizzyTheLizard/ngx-authentication-oidc/actions/workflows/test.yml/badge.svg)

ngx-authentication-oidc is a full fledged authentication solution for Angular using OIDC

## Features
The following OIDC features are supported:
* Automatic provider discovery using [OIDC Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html)
* Login using [Authorization Code Flow](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth), [Implicit Flow](https://openid.net/specs/openid-connect-core-1_0.html#ImplicitFlowAuth) and [Hybrid Flow](https://openid.net/specs/openid-connect-core-1_0.html#HybridFlowAuth). 
* Automatic token updates using [Refresh Tokens](https://openid.net/specs/openid-connect-core-1_0.html#RefreshTokens) or silent login
* [Client initiated logout](https://openid.net/specs/openid-connect-rpinitiated-1_0.html)
* [Session Management](https://openid.net/specs/openid-connect-session-1_0.html)

Additionally this library features:
* Automatic logout after an inactivity timeout
* Automatic session detection at startup using silent logins
* Automatic access token injection for well defined domains
* Pre-Configured [AuthGuards](https://angular.io/api/router/CanActivate)

The library aims to have a simple yet complete interface for those features consisting of [AuthService](projects/ngx-authentication-oidc/src/lib/auth.service.ts) and [SessionService](projects/ngx-authentication-oidc/src/lib/session.service.ts) and a comprehensive [configuration](projects/ngx-authentication-oidc/src/lib/configuration/oauth-config.ts) using meaningful default values.
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

## Usage
TODO

## Documentation
TODO

## Examples
The following examples are provided:
* **[keycloak-sample](projects/keycloak-sample/README.md)**: Simple integration using [Keycloak](https://www.keycloak.org/)
* TODO: Azure
* TODO: Full Config Example
* TODO: Okta? Google?
  
## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[MIT](LICENSE)
