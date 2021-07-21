import nextConnect from 'next-connect';
import { MulterRequest } from './interfaces/multer-request';
import { NextApiResponse } from 'next';

export const apiRoute = nextConnect({
  // Handle any other HTTP method
  onNoMatch(req: MulterRequest, res: NextApiResponse<any>) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});
