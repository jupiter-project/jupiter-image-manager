import { NextApiRequest } from 'next';

export interface AuthApiRequest extends NextApiRequest {
  userInfo: { account: string, passphrase: string, password: string, iat: number };
}
