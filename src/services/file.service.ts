import { gravity } from '../utils/metis/gravity';
import { Logger } from './logger.service';
import { Inject } from 'typescript-ioc';
import { File } from '../models/file.model';
import { UserInfo } from '../interfaces/auth-api-request';
import { ApiConfig } from '../api.config';
import { JupiterError } from '../utils/jupiter-error';
import JupiterFs from '../utils/jupiter-fs';
import zlib from 'zlib';
import { RecordsResponse } from '../interfaces/records-response';
import assert from 'assert';
import { CustomError } from '../utils/custom.error';
import { ErrorCode } from '../enums/error-code.enum';
import { calculateMessageFee } from '../utils/utils';
import { StorageService } from './storage.service';
import { FileAccount, FileProps } from '../interfaces/file-props';

export class FileService {
  private logger: Logger;
  private storage: StorageService;

  constructor(@Inject logger: Logger, @Inject storage: StorageService) {
    this.logger = logger;
    this.storage = storage;
  }

  public async upload(file: Express.Multer.File, userInfo: UserInfo) {
    this.logger.silly(`Get storage`);
    const { account, passphrase, publicKey } = await this.storage.get(userInfo);

    const message = zlib.deflateSync(Buffer.from(file.buffer)).toString('base64');
    const fee = calculateMessageFee(message.length);
    this.logger.silly(`File upload fee ${fee} for message length ${message.length}`);

    this.logger.silly('Send funds to account');
    await gravity.sendMoney(account, fee);

    this.logger.silly('Upload raw file');
    const options: FileAccount = {address: account, passphrase, publicKey, password: userInfo.password};
    const fileUploaded = await this.uploadFileWithJupiterFs(file, options);

    this.logger.silly('Extract extra user info');
    const userExtra = await gravity.getAccountInformation(userInfo.passphrase);
    const userAccount = {...userInfo, accountId: userExtra.accountId, publicKey: userExtra.publicKey, encryptionPassword: userInfo.password};

    this.logger.silly('Merge file and jupiter fs response');
    const metadata: FileProps = {
      user_address: userAccount.account,
      public_key: userAccount.publicKey,
      metadata: {
        ...file,
        ...fileUploaded,
        id: undefined,
        fileId: fileUploaded.id,
        buffer: undefined,
        version: 1,
        txns: fileUploaded.txns,
      },
    };

    this.logger.silly('Create new file record');
    const fileRecord = new File(metadata);
    fileRecord.accessLink = userAccount;
    await fileRecord.create();

    this.logger.silly('New file created!');
    return fileRecord.record;
  }

  public async getAll(userInfo: UserInfo): Promise<RecordsResponse> {
    const { account, hasStorage } = await this.storage.getStorageBreakdown(userInfo);

    this.logger.silly('Check storage');
    assert(hasStorage, CustomError.create('Storage not found', ErrorCode.NOT_FOUND));

    this.logger.silly('Create new file record');
    const fileRecord = new File({user_address: account.account, public_key: account.publicKey});
    fileRecord.accessLink = account;

    return await fileRecord.loadRecords(account);
  }

  async getById(id: string, userInfo: UserInfo): Promise<any> {
    // TODO Check if it's possible to get the transaction only to avoid load all transactions
    this.logger.silly('Get all files and find record');
    const files = await this.getAll(userInfo);
    const record = files.records.find(file => file.id === id);

    assert(record, CustomError.create('File not found', ErrorCode.NOT_FOUND))

    this.logger.silly(`Get storage`);
    const { account: address, passphrase, publicKey } = await this.storage.get(userInfo);

    this.logger.silly(`Create jupiter instance`);
    const options = {server: ApiConfig.jupiterServer, address, passphrase, encryptSecret: userInfo.password, publicKey};
    const uploader = JupiterFs(options);

    this.logger.silly('Get JupiterFS file');
    try {
      const buffer = await uploader.getFile({id: record.file_record.id});

      return {...record.file_record, buffer};
    } catch (error) {
      throw JupiterError.parseJupiterResponseError(error);
    }
  }

  private async uploadFileWithJupiterFs(file: Express.Multer.File, account: FileAccount) {
    const {address, passphrase, password, publicKey} = account;

    this.logger.silly(`Create new JupiterFS instance`);
    const options = {server: ApiConfig.jupiterServer, address, passphrase, encryptSecret: password, publicKey};
    const uploader = JupiterFs(options);

    const message = zlib.deflateSync(Buffer.from(file.buffer)).toString('base64');
    const fee = calculateMessageFee(message.length);
    this.logger.silly(`File upload fee ${fee} for message length ${message.length}`);

    this.logger.silly('Send funds to account');
    await gravity.sendMoney(address, fee);

    this.logger.silly('Upload file to Jupiter');
    try {
      return await uploader.writeFile(file.filename, file.buffer);
    } catch (error) {
      throw JupiterError.parseJupiterResponseError(error);
    }
  }
}
