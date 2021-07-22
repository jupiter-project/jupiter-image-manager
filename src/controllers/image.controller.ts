import { Inject } from 'typescript-ioc';
import { ImageService } from '../services/image.service';
import { Logger } from '../services/logger.service';
import { Readable } from 'stream';
import { NextApiRequest, NextApiResponse } from 'next';
import { ImageType } from '../enums/image-type.enum';
import { ErrorHandler } from '../services/error-handler.service';
import { MulterRequest } from '../interfaces/multer-request';

export class ImageController {
  private logger: Logger;
  private imageService: ImageService;
  private errorHandler: ErrorHandler;

  constructor(@Inject logger: Logger, @Inject errorHandler: ErrorHandler, @Inject imageService: ImageService) {
    this.logger = logger;
    this.imageService = imageService;
    this.errorHandler = errorHandler;
  }

  public async getImageById(req: NextApiRequest, res: NextApiResponse) {
    try {
      const id = req.query.id as string;
      const type = req.query.type as ImageType || 'thumb';

      this.logger.silly('Requesting file', id, type);

      const {mimetype, originalname, buffer} = await this.imageService.get(id, type);

      res.setHeader('Content-Type', mimetype);
      res.setHeader('Content-Disposition', `inline; filename="${originalname}"`);

      const readable = Readable.from(buffer);
      readable.pipe(res);
    } catch (error) {
      this.errorHandler.process(error, res);
    }
  }

  public async uploadImage(req: MulterRequest, res: NextApiResponse) {
    this.logger.silly();

    try {
      const data = await this.imageService.upload(req.file);
      res.status(200).json({data});
    } catch (error) {
      this.errorHandler.process(error, res);
    }
  }

  public async deleteImage(req: MulterRequest, res: NextApiResponse) {
    this.logger.silly();

    try {
      const id = req.query.id as string;
      await this.imageService.delete(id);

      res.status(200);
    } catch (error) {
      this.errorHandler.process(error, res);
    }
  }

  public async getAllImages(req: MulterRequest, res: NextApiResponse) {
    this.logger.silly();
    const data = await this.imageService.getAll();
    res.status(200).json({data});
  }
}
