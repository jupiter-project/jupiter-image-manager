import {NextApiRequest} from 'next';

export interface MulterRequest extends NextApiRequest {
  file: Express.Multer.File;
}
