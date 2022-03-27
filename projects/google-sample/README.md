# Azure-Sample

Simple example using [Google Identity](projects/google-sample/README.md). It consists of multiple pages and a minimal configuration
1. **/public**: A simple public page
2. **/public2**: A second public page
3. **/private**: A private page showing some user information and performing some REST-Calls
4. **/auth/error**: The error page

The example uses a predefined Google App to log in
## Start
To start the example do the following:

1. Build the main library
    ``` 
    npm build ngx-authentication-oidc
    ```
2. Start the example
    ``` 
    npm start google-sample
    ```
3. Open [localhost:4200](http://localhost:4200) in a browser. You can then log into the application using a google account
