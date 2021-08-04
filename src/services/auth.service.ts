import jwt from 'jsonwebtoken';
import assert from 'assert';
import { CustomError } from '../utils/custom.error';
import { ErrorCode } from '../enums/error-code.enum';
import { ApiConfig } from '../api.config';

const ERRORS = {
  ACCOUNT: 'Account is required and must be a string',
  PASSPHRASE: 'Passphrase is required and must be a string',
  JWT: 'JWT Secret not defined',
  AUTHORIZATION: 'Authorization header not defined',
  BEARER: 'Token must start with Bearer [token]',
};

export class AuthService {

  async signIn(payload: any): Promise<string> {
    const {account, passphrase} = payload;

    assert(typeof account === 'string', CustomError.create(ERRORS.ACCOUNT, ErrorCode.PARAM_MISSING));
    assert(typeof passphrase === 'string', CustomError.create(ERRORS.PASSPHRASE, ErrorCode.PARAM_MISSING));

    assert(ApiConfig.jwtSecret, CustomError.create(ERRORS.JWT, ErrorCode.AUTH));

    return jwt.sign(payload, ApiConfig.jwtSecret);
  }

  verifyToken(authHeader: string | undefined) {
    assert(typeof authHeader === 'string', CustomError.create(ERRORS.AUTHORIZATION, ErrorCode.UNAUTHORIZED));
    assert(authHeader.startsWith('Bearer '), CustomError.create(ERRORS.BEARER, ErrorCode.UNAUTHORIZED));

    try {
      const token = authHeader.substring(7, authHeader.length);
      return jwt.verify(token, ApiConfig.jwtSecret);
    } catch (error) {
      throw CustomError.create(error.message, ErrorCode.UNAUTHORIZED);
    }
  }
}
