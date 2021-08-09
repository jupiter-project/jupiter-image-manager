import { NextApiRequest, NextApiResponse } from 'next';
import { apiNoAuth as api } from '../../../api';
import { Container } from 'typescript-ioc';
import { AuthController } from '../../../controllers/auth.controller';

const controller = Container.get(AuthController);

const apiRoute = api();

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse<{ token: string }>) =>
  await controller.signIn(req, res)
);

export default apiRoute;
