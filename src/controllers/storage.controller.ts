import { NextApiResponse } from 'next';
import { Inject } from 'typescript-ioc';
import { StorageService } from '../services/storage.service';
import { AuthApiRequest } from '../interfaces/auth-api-request';
import { CustomError } from '../utils/custom.error';
import { ErrorCode } from '../enums/error-code.enum';
import { Logger } from '../services/logger.service';

export class StorageController {
  private logger: Logger;
  private storage: StorageService;

  constructor(@Inject logger: Logger, @Inject storage: StorageService) {
    this.logger = logger;
    this.storage = storage;
  }

  /**
   *
   * @param req
   * @param res
   */
  async createStorage(req: AuthApiRequest, res: NextApiResponse) {
    const data = await this.storage.create(req.userInfo);

    res.status(201).json(data);
  }

  async getStorage(req: AuthApiRequest, res: NextApiResponse) {
    try {
      const data = await this.storage.get(req.userInfo);

      return res.status(200).json(data);
    } catch (error) {
      if (!(error instanceof CustomError && error.code === ErrorCode.NOT_FOUND)) {
        throw error;
      }
    }

    this.logger.silly('Storage not found');
    res.status(200).send(null);
  }
}
