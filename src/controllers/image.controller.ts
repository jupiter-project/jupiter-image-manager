import { Inject } from 'typescript-ioc';
import { ImageService } from '../services/image.service';
import { Logger } from '../services/logger.service';
import { Readable } from 'stream';
import { NextApiRequest, NextApiResponse } from 'next';
import { ImageType } from '../enums/image-type.enum';
import { MulterRequest } from '../interfaces/multer-request';

export class ImageController {
  private logger: Logger;
  private imageService: ImageService;

  constructor(@Inject logger: Logger, @Inject imageService: ImageService) {
    this.logger = logger;
    this.imageService = imageService;
  }

  public async getImageById(req: NextApiRequest, res: NextApiResponse) {
    const id = req.query.id as string;
    const type = req.query.type as ImageType || 'thumb';

    this.logger.silly('Requesting file', id, type);

    const {mimetype, originalname, buffer} = await this.imageService.get(id, type);

    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${originalname}"`);

    const readable = Readable.from(buffer);
    readable.pipe(res);
  }

  public async uploadImage(req: MulterRequest, res: NextApiResponse) {
    this.logger.silly('Uploading image');

    const data = await this.imageService.upload(req.file);
    const url = `http://${req.headers.host}${req.url}/${data.id}`;
    const file = {...req.file, id: data.id, buffer: undefined, url};

    this.logger.silly('File uploaded');

    res.status(200).json(file);
  }

  public async deleteImage(req: MulterRequest, res: NextApiResponse) {
    this.logger.silly('Deleting image');

    const id = req.query.id as string;
    await this.imageService.delete(id);

    this.logger.silly('Image was deleted');

    res.status(202).send(null);
  }

  public async getAllImages(req: MulterRequest, res: NextApiResponse) {
    this.logger.silly('Loading all the images');

    const data = await this.imageService.getAll();

    res.status(200).json({data});
  }
}
