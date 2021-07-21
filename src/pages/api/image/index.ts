import multer from 'multer';
import { Container } from 'typescript-ioc';
import { ImageController } from '../../../controllers/image.controller';
import { apiRoute } from '../../../api';

const index = multer({
  storage: multer.memoryStorage(),
});

const uploadMiddleware = index.single('image');

apiRoute.use(uploadMiddleware);

apiRoute.post(async (req, res) => {
  const controller = Container.get(ImageController);
  const data = await controller.uploadImage(req.file);
  res.status(200).json({data});
});

export default apiRoute;

export const config = {
  api: {
    bodyParser: false, // Disallow body parsing, consume as stream
  },
};
