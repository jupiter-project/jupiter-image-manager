import { Inject, Singleton } from 'typescript-ioc';
import JupiterFs from 'jupiter-fs';
import { ApiConfig } from '../api.config';
import { Logger } from './logger.service';
import { deserialize, serialize } from 'v8';
import { ImageType } from '../enums/image-type.enum';
import { ImageProcessor } from './image-processor.service';
import { JupiterError } from '../utils/jupiter-error';

@Singleton
export class ImageService {
  private logger: Logger;
  private imageProcessor: ImageProcessor;
  // TODO Add extra variables
  // address: process.env.ADDRESS,
  // passphrase: process.env.PASSPHRASE,
  private jupiterFs = JupiterFs(ApiConfig.jupiterFs);

  constructor(@Inject logger: Logger, @Inject imageProcessor: ImageProcessor) {
    this.logger = logger;
    this.imageProcessor = imageProcessor;
  }

  public async upload(file: Express.Multer.File) {
    this.logger.silly(this.upload.name);

    const buffer = serialize(file);

    try {
      return await this.jupiterFs.writeFile(file.filename, buffer);
    } catch (error) {
      throw JupiterError.parseJupiterResponseError(error);
    }
  }

  public async get(id: string, type: ImageType): Promise<Express.Multer.File> {
    this.logger.silly(this.get.name);

    if (!Object.values(ImageType).includes(type)) {
      throw new TypeError('Image type not supported');
    }

    try {
      const buffer = await this.jupiterFs.getFile({id});
      const file = deserialize(buffer) as Express.Multer.File;

      switch (type) {
        case ImageType.thumb:
          file.buffer = await this.imageProcessor.resizeThumb(file.buffer);
          return file;
        case ImageType.raw:
          return file;
      }
    } catch (error) {
      throw JupiterError.parseJupiterResponseError(error);
    }
  }

  public async getAll(): Promise<any> {
    this.logger.silly();

    try {
      return await this.jupiterFs.ls();
    } catch (error) {
      throw JupiterError.parseJupiterResponseError(error);
    }
  }

  async delete(id: string): Promise<void> {
    this.logger.silly();

    try {
      return await this.jupiterFs.deleteFile(id);
    } catch (error) {
      throw JupiterError.parseJupiterResponseError(error);
    }
  }
}
