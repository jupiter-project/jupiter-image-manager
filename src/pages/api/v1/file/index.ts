import multer from 'multer';
import { Container } from 'typescript-ioc';
import { FileController } from '../../../../controllers/file.controller';
import { apiRoute } from '../../../../api';
import { MulterRequest } from '../../../../interfaces/multer-request';

const index = multer({
  storage: multer.memoryStorage(),
});

const uploadMiddleware = index.single('file');

apiRoute.use(uploadMiddleware);

const controller = Container.get(FileController);

apiRoute.post(async (req: MulterRequest, res) =>
  await controller.uploadFile(req, res)
);

apiRoute.get(async (req: MulterRequest, res) =>
  await controller.getAllFiles(req, res)
);

export default apiRoute;

export const config = {
  api: {
    bodyParser: false, // Disallow body parsing, consume as stream
  },
};
