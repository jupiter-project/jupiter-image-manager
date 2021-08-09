import nextConnect from 'next-connect';
import { NextApiRequest, NextApiResponse } from 'next';
import { Container } from 'typescript-ioc';
import { ErrorHandler } from './services/error-handler.service';
import { AuthApiRequest } from './interfaces/auth-api-request';
import { AuthController } from './controllers/auth.controller';

const errorHandler = Container.get(ErrorHandler);
const authController = Container.get(AuthController);

const options = {
  // Handle any other HTTP method
  onNoMatch(req: NextApiRequest, res: NextApiResponse) {
    res.status(405).json({error: `Method '${req.method}' Not Allowed`});
  },
  onError(error: any, req: NextApiRequest, res: NextApiResponse) {
    errorHandler.process(error, res);
  },
};

export const apiNoAuth = () => nextConnect(options);

export const api = () => apiNoAuth()
  .use(async (req: AuthApiRequest, res: NextApiResponse, next) => {
    await authController.verifyToken(req, res, next);
  });
