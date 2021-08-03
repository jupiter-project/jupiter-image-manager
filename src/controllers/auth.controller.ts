import { NextApiRequest, NextApiResponse } from 'next';
import { Inject } from 'typescript-ioc';
import assert from 'assert';
import { Logger } from '../services/logger.service';
import { ErrorHandler } from '../services/error-handler.service';
import { AuthService } from '../services/auth.service';
import { CustomError } from '../utils/custom.error';
import { ErrorCode } from '../enums/error-code.enum';


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
      const { account, passphrase } = req.body;

      assert(typeof account === 'string', CustomError.create('Account is required and must be a string', ErrorCode.PARAM_MISSING));
      assert(typeof passphrase === 'string', CustomError.create('Passphrase is required and must be a string', ErrorCode.PARAM_MISSING));

      const token = await this.auth.signIn({account, passphrase});

      res.status(200).json({token});
    } catch (error) {
      this.errorHandler.process(error, res);
    }
  }
}
