export interface LoginResult {
  isLoggedIn: boolean;
  idToken?: string;
  accessToken?: string;
  refreshToken?: string;
  redirectPath?: string;
  userInfo?: UserInfo;
  expiresAt?: Date;
  stateMessage?: string;
  sessionState?: string;
}

export interface UserInfo {
  sub: string;
}
