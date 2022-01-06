# NgxAuthenticationOidc

The following parts of OIDC are supported:
* OpenID-Connect Core (https://openid.net/specs/openid-connect-core-1_0.html)
* Discovery (https://openid.net/specs/openid-connect-discovery-1_0.html)
* RP-Initiated Logout (https://openid.net/specs/openid-connect-rpinitiated-1_0.html)
* Session Management (https://openid.net/specs/openid-connect-session-1_0.html)


The following parts are not supported:
 * Initiating Login from a Third Party (Chapter 4)
 * Requesting Claims using the "claims" Request Parameter (Chapter 5.5)
 * Passing Request Parameters as JWTs (Chapter 6)
 * Support for Self-Issued OpenID Provider (Chapter 7)
 * Client Authentication (Chapter 9)
 * Offline Access (Chapter 11)
 * Form Post Response (https://openid.net/specs/oauth-v2-form-post-response-mode-1_0.html)
 * Dynamic Client Registration (https://openid.net/specs/openid-connect-registration-1_0.html)
 * Back-Channel Logout (https://openid.net/specs/openid-connect-backchannel-1_0.html)
 * Front-Channel Logout (https://openid.net/specs/openid-connect-frontchannel-1_0.html)




This library was generated with [Angular CLI](https://github.com/angular/angular-cli) version 13.0.0.

## Code scaffolding

Run `ng generate component component-name --project ngx-authentication-oidc` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module --project ngx-authentication-oidc`.
> Note: Don't forget to add `--project ngx-authentication-oidc` or else it will be added to the default project in your `angular.json` file. 

## Build

Run `ng build ngx-authentication-oidc` to build the project. The build artifacts will be stored in the `dist/` directory.

## Publishing

After building your library with `ng build ngx-authentication-oidc`, go to the dist folder `cd dist/ngx-authentication-oidc` and run `npm publish`.

## Running unit tests

Run `ng test ngx-authentication-oidc` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
