import {NextApiRequest, NextApiResponse} from 'next';
import {Container} from 'typescript-ioc';
import {FileController} from '../../../controllers/file.controller';
import {Logger} from '../../../services/logger.service';
import {Readable} from 'stream';

const logger = Container.get(Logger);
const controller = Container.get(FileController);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = req.query.id as string;
  logger.silly('[image][id]', id);

  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Content-Disposition', 'inline; filename="thumb.jpeg"');

  const data = await controller.getFile(id);
  const readable = Readable.from(data);

  readable.pipe(res);
}
