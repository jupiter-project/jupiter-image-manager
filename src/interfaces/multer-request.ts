import { AuthApiRequest } from './auth-api-request';

export interface MulterRequest extends AuthApiRequest {
  file: Express.Multer.File;
}
