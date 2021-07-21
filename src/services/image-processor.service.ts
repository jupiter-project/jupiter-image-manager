import sharp from 'sharp';
import { AppConfig } from '../app.config';

export class ImageProcessor {

  async resizeThumb(buffer: Buffer): Promise<Buffer> {
    const {width, height, fit} = AppConfig.imageResize.thumb;

    return await sharp(buffer)
      .resize(width, height, {fit})
      .toBuffer();
  }
}
