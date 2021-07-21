import {NextApiRequest, NextApiResponse} from 'next';
import {Container} from 'typescript-ioc';
import {FileController} from '../../../controllers/file.controller';
import {Logger} from '../../../services/logger.service';
import {Readable} from 'stream';

const logger = Container.get(Logger);
const controller = Container.get(FileController);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await controller.getImageById(req, res)
};
