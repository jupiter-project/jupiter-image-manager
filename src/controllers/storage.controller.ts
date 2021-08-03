import { NextApiRequest } from 'next/dist/next-server/lib/utils';
import { NextApiResponse } from 'next';

export class StorageController {

  async createStorage(req: NextApiRequest, res: NextApiResponse) {
    res.status(200).json({name: 'Hello world!'});
  }
}
