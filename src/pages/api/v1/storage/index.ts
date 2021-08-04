import { Container } from 'typescript-ioc';
import { NextApiResponse } from 'next';
import { apiRoute } from '../../../../api';
import { AuthController } from '../../../../controllers/auth.controller';
import { StorageController } from '../../../../controllers/storage.controller';
import { AuthApiRequest } from '../../../../interfaces/auth-api-request';

const controller = Container.get(StorageController);
const authController = Container.get(AuthController);

apiRoute.use(async (req: AuthApiRequest, res: NextApiResponse, next) => {
  await authController.verifyToken(req, res, next);
});

apiRoute.post(async (req: AuthApiRequest, res: NextApiResponse) =>
  controller.createStorage(req, res)
);

export default apiRoute;
