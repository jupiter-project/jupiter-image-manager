import { Container } from 'typescript-ioc';
import { NextApiResponse } from 'next';
import { apiRoute } from '../../../../api';
import { StorageController } from '../../../../controllers/storage.controller';
import { AuthApiRequest } from '../../../../interfaces/auth-api-request';

const controller = Container.get(StorageController);

apiRoute.post(async (req: AuthApiRequest, res: NextApiResponse) =>
  controller.createStorage(req, res)
);

export default apiRoute;
