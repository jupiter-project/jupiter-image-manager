import { NextApiRequest, NextApiResponse } from 'next';
import { apiRouteNoAuth as apiRoute } from '../../../api';
import { Container } from 'typescript-ioc';
import { AuthController } from '../../../controllers/auth.controller';

const controller = Container.get(AuthController);

apiRoute.post(async (req: NextApiRequest, res: NextApiResponse<{ token: string }>) =>
  await controller.signIn(req, res)
);

export default apiRoute;
