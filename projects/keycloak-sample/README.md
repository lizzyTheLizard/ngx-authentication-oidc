# Keycloak-Sample

Simple example using [Keycloak](https://www.keycloak.org/). It consists of multiple pages and a minimal configuration
1. **/public**: A simple public page
1. **/public2**: A second public page
1. **/private**: A private page showing some user information and performing some REST-Calls
1. **/auth/error**: The error page

## Start
To start the example do the following:

1. Start the need docker containers. This will start a pre-configured Keycloak instance and a dummy resource server
    ```sh
    cd projects/keycloak-sammple/docker
    docker-compose up
    ```
2. Build the main library
    ``` 
    npm build ngx-authentication-oidc
    ```
3. Start the example
    ``` 
    npm start keycloak-sample
    ```
4. Open [localhost:4200](http://localhost:4200) in a browser. You can then register an account and log into the application
