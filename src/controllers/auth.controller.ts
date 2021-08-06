import { NextApiRequest, NextApiResponse } from 'next';
import { Inject } from 'typescript-ioc';
import { NextHandler } from 'next-connect';
import { Logger } from '../services/logger.service';
import { AuthService } from '../services/auth.service';
import { AuthApiRequest, UserInfo } from '../interfaces/auth-api-request';

export class AuthController {
  private logger: Logger;
  private auth: AuthService;

  constructor(@Inject logger: Logger, @Inject auth: AuthService) {
    this.logger = logger;
    this.auth = auth;
  }

  async signIn(req: NextApiRequest, res: NextApiResponse<{ token: string }>) {
    this.logger.silly('Signing in');

    const token = await this.auth.signIn(req.body);
    this.logger.silly('New token created');

    res.status(200).json({token});
  }

  async verifyToken(req: AuthApiRequest, res: NextApiResponse, next: NextHandler) {
    this.logger.silly('Verifying token');

    const {authorization} = req.headers;
    req.userInfo = this.auth.verifyToken(authorization) as UserInfo;

    this.logger.silly('Token was verified');

    next();
  }
}
