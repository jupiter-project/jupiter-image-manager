import nextConnect from 'next-connect';
import { NextApiRequest, NextApiResponse } from 'next';
import { Container } from 'typescript-ioc';
import { ErrorHandler } from './services/error-handler.service';

const errorHandler = Container.get(ErrorHandler);

export const apiRoute = nextConnect({
  // Handle any other HTTP method
  onNoMatch(req: NextApiRequest, res: NextApiResponse) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
  onError(error, req, res) {
    errorHandler.process(error, res);
  },
});
