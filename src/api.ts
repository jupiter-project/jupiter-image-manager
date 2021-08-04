import nextConnect from 'next-connect';
import { NextApiRequest, NextApiResponse } from 'next';

export const apiRoute = nextConnect({
  // Handle any other HTTP method
  onNoMatch(req: NextApiRequest, res: NextApiResponse) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});
