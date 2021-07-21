import multer from 'multer';
import { Container } from 'typescript-ioc';
import { ImageController } from '../../../controllers/image.controller';
import { apiRoute } from '../../../api';

const index = multer({
  storage: multer.memoryStorage(),
});

const uploadMiddleware = index.single('image');

apiRoute.use(uploadMiddleware);

const controller = Container.get(ImageController);

apiRoute.post(async (req, res) =>
  await controller.uploadImage(req, res)
);

export default apiRoute;

export const config = {
  api: {
    bodyParser: false, // Disallow body parsing, consume as stream
  },
};
