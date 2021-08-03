import multer from 'multer';
import { Container } from 'typescript-ioc';
import { ImageController } from '../../../../controllers/image.controller';
import { apiRoute } from '../../../../api';
import { MulterRequest } from '../../../../interfaces/multer-request';

const index = multer({
  storage: multer.memoryStorage(),
});

const uploadMiddleware = index.single('image');

apiRoute.use(uploadMiddleware);

const controller = Container.get(ImageController);

apiRoute.post(async (req: MulterRequest, res) =>
  await controller.uploadImage(req, res)
);

apiRoute.get(async (req: MulterRequest, res) =>
  await controller.getAllImages(req, res)
);

export default apiRoute;

export const config = {
  api: {
    bodyParser: false, // Disallow body parsing, consume as stream
  },
};
