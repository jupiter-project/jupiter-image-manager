import { Container } from 'typescript-ioc';
import { ImageController } from '../../../../controllers/image.controller';
import { apiRoute } from '../../../../api';
import { MulterRequest } from '../../../../interfaces/multer-request';

const controller = Container.get(ImageController);

apiRoute.get(async (req, res) =>
  await controller.getImageById(req, res)
);

apiRoute.delete(async (req: MulterRequest, res) =>
  await controller.deleteImage(req, res)
);

export default apiRoute;
