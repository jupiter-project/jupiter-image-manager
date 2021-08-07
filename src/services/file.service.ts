import { gravity } from '../utils/metis/gravity';
import { Logger } from './logger.service';
import { Inject } from 'typescript-ioc';
import Methods from '../utils/metis/_methods';
import { File } from '../models/file';
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

export class FileService {
  private logger: Logger;

  constructor(@Inject logger: Logger) {
    this.logger = logger;
  }

  public async upload(file: Express.Multer.File, userInfo: UserInfo) {
    this.logger.silly('Create new account for the image');
    const passphrase = Methods.generate_passphrase();
    const password = Methods.generate_keywords();
    const extraInfo = await gravity.getAccountInformation(passphrase);
    const account = {...extraInfo, passphrase, password, success: undefined};

    this.logger.info(`Account info`);
    this.logger.info(`Passphrase: ${passphrase}`);
    this.logger.info(`Password: ${password}`);
    this.logger.info(`ExtraInfo: ${extraInfo.address}`);

    this.logger.silly(`Create new Jupiter instance`);
    const {address, password: encryptSecret, publicKey} = account;

    this.logger.silly(`New file account: ${address}`);
    const options = {server: ApiConfig.jupiterServer, address, passphrase, encryptSecret, publicKey};
    const uploader = JupiterFs(options);

    const message = zlib.deflateSync(Buffer.from(file.buffer)).toString('base64');
    const fee = calculateMessageFee(message.length);
    this.logger.silly(`File upload fee ${fee} for message length ${message.length}`);

    this.logger.silly('Send funds to account');
    const a = await gravity.sendMoney(address, fee);

    this.logger.silly('Sleep 26 seconds. Waiting new Jupiter block');
    await new Promise(resolve => setTimeout(resolve, 30000));

    this.logger.silly('Upload file to Jupiter');
    let fileUploaded;
    try {
      fileUploaded = await uploader.writeFile(file.filename, file.buffer);
    } catch (error) {
      throw JupiterError.parseJupiterResponseError(error);
    }

    this.logger.silly('Merge file and jupiter fs response');
    const metadata = {...file, buffer: undefined, version: 1, ...fileUploaded, txns: fileUploaded.txns};

    this.logger.silly('Extract extra user info');
    const userExtra = await gravity.getAccountInformation(userInfo.passphrase);

    this.logger.silly('Complete user info');
    const userAccount = {...userInfo, accountId: userExtra.accountId, publicKey: userExtra.publicKey, encryptionPassword: userInfo.password};

    this.logger.silly('Create new file record');
    const fileRecord = new File({user_address: userAccount.account, public_key: userAccount.publicKey, metadata});
    fileRecord.accessLink = userAccount;

    this.logger.silly('Create file in the blockchain');
    await fileRecord.create(account);

    this.logger.silly('New file created!');
    return fileRecord.record;
  }

  public async getAll(userInfo: UserInfo): Promise<RecordsResponse> {
    const {accountId, publicKey} = await gravity.getAccountInformation(userInfo.passphrase);

    this.logger.silly('Complete user info');
    const userAccount = {...userInfo, accountId: accountId, publicKey: publicKey, encryptionPassword: userInfo.password};

    this.logger.silly('Create new file record');
    const fileRecord = new File({user_address: userAccount.account, public_key: userAccount.publicKey});
    fileRecord.accessLink = userAccount;

    return await fileRecord.loadRecords(userAccount);
  }

  async getById(id: string, userInfo: UserInfo): Promise<any> {
    this.logger.silly('Get all files and find record');
    const files = await this.getAll(userInfo);
    const record = files.records.find(file => file.id === id);

    assert(record, CustomError.create('File not found', ErrorCode.NOT_FOUND))

    this.logger.silly(`Create jupiter instance`);
    const {file_record: {account: address, passphrase, password: encryptSecret, publicKey, metadata}} = record;
    const options = {server: ApiConfig.jupiterServer, address, passphrase, encryptSecret, publicKey, minimumFndrAccountBalance: 10000};
    const uploader = JupiterFs(options);

    this.logger.silly('Get JupiterFS file');
    try {
      const buffer = await uploader.getFile({id: metadata.id});

      return {...metadata, buffer};
    } catch (error) {
      throw JupiterError.parseJupiterResponseError(error);
    }
  }

  private static calculateMessageFee(length: number): number {
    return Math.round(length * 30000 / 5000);
  }
}
