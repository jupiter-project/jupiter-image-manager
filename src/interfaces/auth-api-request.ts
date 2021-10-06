import { NextApiRequest } from 'next';

export interface UserInfo {
  account: string;
  passphrase: string;
  password: string;
  publicKey?: string;
  accountId?: string;
  iat?: number;
}

export interface AuthApiRequest extends NextApiRequest {
  userInfo: UserInfo;
}
