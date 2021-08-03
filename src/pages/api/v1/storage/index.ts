import { Container } from 'typescript-ioc';
import { NextApiRequest, NextApiResponse } from 'next';
import { apiRoute } from '../../../../api';
import { AuthController } from '../../../../controllers/auth.controller';
import { StorageController } from '../../../../controllers/storage.controller';

const controller = Container.get(StorageController);
const authController = Container.get(AuthController);

apiRoute.use(async (req: NextApiRequest, res: NextApiResponse, next) => {
  await authController.verifyToken(req, res, next);
});

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse) =>
  controller.createStorage(req, res)
);

export default apiRoute;
