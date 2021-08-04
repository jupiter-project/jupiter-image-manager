import { NextApiRequest, NextApiResponse } from 'next';
import { Inject } from 'typescript-ioc';
import { NextHandler } from 'next-connect';
import { Logger } from '../services/logger.service';
import { ErrorHandler } from '../services/error-handler.service';
import { AuthService } from '../services/auth.service';
import { AuthApiRequest } from '../interfaces/auth-api-request';


export class AuthController {
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private auth: AuthService;

  constructor(@Inject logger: Logger, @Inject errorHandler: ErrorHandler, @Inject auth: AuthService) {
    this.logger = logger;
    this.errorHandler = errorHandler;
    this.auth = auth;
  }

  async signIn(req: NextApiRequest, res: NextApiResponse<{ token: string }>) {
    this.logger.silly();

    try {
      const {account, passphrase} = req.body;
      const token = await this.auth.signIn({account, passphrase});

      res.status(200).json({token});
    } catch (error) {
      this.errorHandler.process(error, res);
    }
  }

  async verifyToken(req: AuthApiRequest, res: NextApiResponse, next: NextHandler) {
    this.logger.silly();

    try {
      const {authorization} = req.headers;
      req.userInfo = this.auth.verifyToken(authorization) as any;

      next();
    } catch (error) {
      this.errorHandler.process(error, res);
    }
  }
}
