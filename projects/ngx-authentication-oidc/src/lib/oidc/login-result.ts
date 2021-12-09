
export interface LoginResult {
    isLoggedIn: boolean;
    idToken?: string;
    accessToken?: string;
    redirectPath?: string;
    userInfo?: UserInfo;
    expiresAt?: Date;
    stateMessage?: string;
  }

export interface UserInfo {
    
}
