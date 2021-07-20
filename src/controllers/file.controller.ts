import { Inject } from 'typescript-ioc';
import { FileService } from '../services/file.service';
import { Logger } from '../services/logger.service';
import { ImageProcessor } from '../services/image-processor.service';

export class FileController {
  private logger: Logger;
  private fileService: FileService;
  private imageProcessor: ImageProcessor;

  constructor(@Inject logger: Logger, @Inject fileService: FileService, @Inject imageProcessor: ImageProcessor) {
    this.logger = logger;
    this.fileService = fileService;
    this.imageProcessor = imageProcessor;
  }

  async uploadFile(file: Express.Multer.File) {
    this.logger.silly('Uploading file');
    return await this.fileService.upload(file.filename, file.buffer);
  }

  async getFile(id: string): Promise<Buffer> {
    this.logger.silly('Requesting file');
    return await this.fileService.get(id);
  }

  async processImage(file: Express.Multer.File) {
    this.logger.silly('Processing image');
    return this.imageProcessor.resizeThumb(file.buffer);
  }
}
