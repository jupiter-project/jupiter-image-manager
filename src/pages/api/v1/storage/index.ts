import { Container } from 'typescript-ioc';
import { NextApiResponse } from 'next';
import { api } from '../../../../api';
import { StorageController } from '../../../../controllers/storage.controller';
import { AuthApiRequest } from '../../../../interfaces/auth-api-request';

const controller = Container.get(StorageController);

const apiRoute = api();

apiRoute.post(async (req: AuthApiRequest, res: NextApiResponse) =>
  controller.createStorage(req, res)
);

apiRoute.get(async (req: AuthApiRequest, res: NextApiResponse) =>
  controller.getStorage(req, res)
);

export default apiRoute;
