import { Container, Inject, Singleton } from 'typescript-ioc';
import JupiterFs from 'jupiter-fs';
import { AppConfig } from '../app.config';
import { Logger } from './logger.service';
import { deserialize, serialize } from 'v8';
import { ImageType } from '../enums/image-type.enum';
import { ImageProcessor } from './image-processor.service';

@Singleton
export class FileService {
  private logger: Logger;
  private imageProcessor: ImageProcessor;
  private jupiterFs = JupiterFs(AppConfig.jupiterFs);

  constructor(@Inject logger: Logger, @Inject imageProcessor: ImageProcessor) {
    this.logger = logger;
    this.imageProcessor = imageProcessor;
  }

  public async upload(file: Express.Multer.File) {
    this.logger.silly(this.upload.name);

    const buffer = serialize(file);

    return await this.jupiterFs.writeFile(file.filename, buffer);
  }

  public async get(id: string, type: ImageType): Promise<Express.Multer.File> {
    this.logger.silly(this.get.name);

    if (!Object.values(ImageType).includes(type)) {
      throw new TypeError('Image type not supported');
    }

    const buffer = await this.jupiterFs.getFile({id});
    const file = deserialize(buffer) as Express.Multer.File;

    switch (type) {
      case ImageType.thumb:
        file.buffer = await this.imageProcessor.resizeThumb(file.buffer);
        return file;
      case ImageType.raw:
        return file;
    }
  }
}