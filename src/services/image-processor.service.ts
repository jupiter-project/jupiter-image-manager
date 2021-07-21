import sharp from 'sharp';
import { ApiConfig } from '../api.config';

export class ImageProcessor {

  async resizeThumb(buffer: Buffer): Promise<Buffer> {
    const {width, height, fit} = ApiConfig.imageResize.thumb;

    return await sharp(buffer)
      .resize(width, height, {fit})
      .toBuffer();
  }
}
