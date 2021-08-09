import { Container } from 'typescript-ioc';
import { api } from '../../../../api';
import { MulterRequest } from '../../../../interfaces/multer-request';
import { FileController } from '../../../../controllers/file.controller';
import { AuthApiRequest } from '../../../../interfaces/auth-api-request';

const controller = Container.get(FileController);

const apiRoute = api();

apiRoute.get(async (req: MulterRequest, res) =>
  await controller.getFileById(req, res)
);

apiRoute.delete(async (req: AuthApiRequest, res) =>
  await controller.deleteFile(req, res)
);

export default apiRoute;
