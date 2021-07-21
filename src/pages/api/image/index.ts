import type { NextApiResponse } from 'next';
import multer from 'multer';
import nextConnect from 'next-connect';
import {MulterRequest} from '../../../interfaces/multer-request';
import {Container} from 'typescript-ioc';
import {FileController} from '../../../controllers/file.controller';

// TODO Move this code to external service/helper
const apiRoute = nextConnect({
  // Handle any other HTTP method
  onNoMatch(req: MulterRequest, res: NextApiResponse<any>) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

const index = multer({
  storage: multer.memoryStorage(),
});

const uploadMiddleware = index.single('image');

apiRoute.use(uploadMiddleware);

apiRoute.post(async (req, res) => {
  const controller = Container.get(FileController);
  const data = await controller.uploadImage(req.file);
  res.status(200).json({ data });
});

export default apiRoute;

export const config = {
  api: {
    bodyParser: false, // Disallow body parsing, consume as stream
  },
};
