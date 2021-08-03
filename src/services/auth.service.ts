import jwt from 'jsonwebtoken';
import assert from 'assert';
import { CustomError } from '../utils/custom.error';
import { ErrorCode } from '../enums/error-code.enum';

export class AuthService {

  async signIn(payload: any): Promise<string> {
    assert(process.env.JWT_SECRET, CustomError.create('JWT Secret not defined', ErrorCode.AUTH));

    return jwt.sign(payload, process.env.JWT_SECRET);
  }
}
