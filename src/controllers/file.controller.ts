import { Inject } from 'typescript-ioc';
import { Logger } from '../services/logger.service';
import { FileService } from '../services/file.service';
import { MulterRequest } from '../interfaces/multer-request';
import { NextApiResponse } from 'next';
import { StorageService } from '../services/storage.service';
import { ImageType } from '../enums/image-type.enum';
import { AuthApiRequest } from '../interfaces/auth-api-request';
import { Readable } from 'stream';

export class FileController {
  private logger: Logger;
  private fileService: FileService;
  private storage: StorageService;

  constructor(@Inject logger: Logger, @Inject fileService: FileService, @Inject storage: StorageService) {
    this.logger = logger;
    this.fileService = fileService;
    this.storage = storage;
  }

  async uploadFile(req: MulterRequest, res: NextApiResponse) {
    let myresp = {};

    this.logger.silly('Uploading file');

    this.logger.silly('Loading storage');

    // const storage = await this.storage.findOrCreate(req.userInfo);
    const image = await this.fileService.upload(req.file, req.userInfo);

    myresp = image;
    // Create image account and return

    res.status(200).json(myresp);
  }

  async getAllFiles(req: MulterRequest, res: NextApiResponse) {
    const files = await this.fileService.getAll(req.userInfo);
    res.status(200).json(files);
  }

  async getFileById(req: MulterRequest, res: NextApiResponse) {
    const id = req.query.id as string;
    const file = await this.fileService.getById(id, req.userInfo);
    const {mimetype, originalname, buffer} = file;

    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${originalname}"`);

    const readable = Readable.from(buffer);
    readable.pipe(res);
  }

  async deleteFile(req: AuthApiRequest, res: NextApiResponse) {
    res.status(200).json('ok');
  }
}
