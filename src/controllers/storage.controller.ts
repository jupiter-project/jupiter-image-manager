import { NextApiResponse } from 'next';
import { Inject } from 'typescript-ioc';
import { StorageService } from '../services/storage.service';
import { AuthApiRequest } from '../interfaces/auth-api-request';

export class StorageController {
  private storage: StorageService;

  constructor(@Inject storage: StorageService) {
    this.storage = storage;
  }

  async createStorage(req: AuthApiRequest, res: NextApiResponse) {
    const data = await this.storage.create(req.userInfo);

    res.status(200).json({data});
  }

  async getStorage(req: AuthApiRequest, res: NextApiResponse) {
    const data = await this.storage.get(req.userInfo);

    res.status(200).json({data});
  }
}
