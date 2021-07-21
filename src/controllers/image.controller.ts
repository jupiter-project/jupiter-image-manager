import { Inject } from 'typescript-ioc';
import { ImageService } from '../services/image.service';
import { Logger } from '../services/logger.service';
import { Readable } from 'stream';
import { NextApiRequest, NextApiResponse } from 'next';
import { ImageType } from '../enums/image-type.enum';
import { ErrorHandler } from '../services/error-handler.service';

export class ImageController {
  private logger: Logger;
  private fileService: ImageService;
  private errorHandler: ErrorHandler;

  constructor(@Inject logger: Logger, @Inject errorHandler: ErrorHandler, @Inject fileService: ImageService) {
    this.logger = logger;
    this.fileService = fileService;
    this.errorHandler = errorHandler;
  }

  public async getImageById(req: NextApiRequest, res: NextApiResponse) {
    try {
      const id = req.query.id as string;
      const type = req.query.type as ImageType || 'thumb';

      this.logger.silly('Requesting file', id, type);

      const {mimetype, originalname, buffer} = await this.fileService.get(id, type);

      res.setHeader('Content-Type', mimetype);
      res.setHeader('Content-Disposition', `inline; filename="${originalname}"`);

      const readable = Readable.from(buffer);
      readable.pipe(res);
    } catch (error) {
      this.errorHandler.process(error, res);
    }
  }

  public async uploadImage(file: Express.Multer.File) {
    this.logger.silly('Uploading file');
    return await this.fileService.upload(file);
  }
}
