import { Inject } from 'typescript-ioc';
import { Logger } from '../services/logger.service';
import { FileService } from '../services/file.service';
import { MulterRequest } from '../interfaces/multer-request';
import { NextApiResponse } from 'next';
import { StorageService } from '../services/storage.service';
import {AuthApiRequest, UserInfo} from '../interfaces/auth-api-request';
import { Readable } from 'stream';
import assert from 'assert';
import { CustomError } from '../utils/custom.error';
import { ErrorCode } from '../enums/error-code.enum';
import { ApiConfig } from '../api.config';
import { ImageType } from '../enums/image-type.enum';

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
    this.logger.silly('###########################################')
    this.logger.silly('## uploadFile(req, res)');
    this.logger.silly('##');


    assert(
      req.file.size <= ApiConfig.maxMbSize * 1024 * 1024,
      CustomError.create(`File size must be lower than ${ApiConfig.maxMbSize} MB`, ErrorCode.FORBIDDEN)
    );

    this.logger.info('Uploading file');
    const file = await this.fileService.upload(req.file, req.userInfo);
    const url = `${ApiConfig.host}/api/v1/file/${file.id}`;

    res.status(200).json({...file, txns: undefined, url});
  }

  async getAllFiles(req: MulterRequest, res: NextApiResponse) {
    const files = await this.fileService.getAll(req.userInfo);
    res.status(200).json(files);
  }

  async getFileById(req: MulterRequest, res: NextApiResponse) {
    const id = req.query.id as string;
    this.logger.info('Loading file:', id);
    const userInfo = req.userInfo as UserInfo;

    if(!userInfo){
      return res.status(500).send({ message:'User info is required'} );
    }

    if(!userInfo.password){
      return res.status(500).send({ message:'Password is required for decrypting file'} );
    }


    // TODO Here it can support multiple options for processing images
    const type = req.query.type as ImageType || 'thumb';
    const file = await this.fileService.getById(id, {type}, userInfo);
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
