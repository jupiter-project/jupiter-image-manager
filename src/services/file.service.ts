import {Readable} from "stream";

const  {gravity} = require('../utils/metis/gravity');
import {Logger} from './logger.service';
import {Inject} from 'typescript-ioc';
import {File} from '../models/file.model';
import {UserInfo} from '../interfaces/auth-api-request';
import {ApiConfig} from '../api.config';
import {JupiterError} from '../utils/jupiter-error';
import JupiterFs from '../utils/jupiter-fs';
import {RecordsResponse} from '../interfaces/records-response';
import assert from 'assert';
import {CustomError} from '../utils/custom.error';
import {ErrorCode} from '../enums/error-code.enum';
import {StorageService} from './storage.service';
import { FileAccount, FileOptions, FileProps } from '../interfaces/file-props';
import {TransactionChecker} from './transaction-checker.service';
import {Buffer} from "buffer";
import { calculateMessageFee } from '../utils/utils';
import { ImageProcessor } from './image-processor.service';
import { ImageType } from '../enums/image-type.enum';

const crypto = require('crypto');

export class FileService {
  private logger: Logger;
  private storage: StorageService;
  private imageProcessor: ImageProcessor;
  private transactionChecker: TransactionChecker;

  constructor(
      @Inject logger: Logger,
      @Inject storage: StorageService,
      @Inject transactionChecker: TransactionChecker,
      @Inject imageProcessor: ImageProcessor
      ) {
    this.logger = logger;
    this.storage = storage;
    this.imageProcessor = imageProcessor;
    this.transactionChecker = transactionChecker;
  }

  public async upload(file: Express.Multer.File, userInfo: UserInfo) {
    this.logger.silly(`###########################################`)
    this.logger.silly(`## upload(file, userInfo)`)
    this.logger.silly(`##`)

    const fileUploaded = await this.uploadFileWithJupiterFs(file, userInfo);

    this.logger.silly('Extract extra user info');
    const userExtra = await gravity.getAccountInformation(userInfo.passphrase);
    const userAccount = {...userInfo, accountId: userExtra.accountId, publicKey: userExtra.publicKey, encryptionPassword: userInfo.password};

    this.logger.silly('Merge file and jupiter fs response');
    const metadata: FileProps = {
      user_address: userAccount.account,
      public_key: userAccount.publicKey,
      metadata: {
        ...file,
        ...fileUploaded.originalFile,
        id: undefined,
        fileId: fileUploaded.originalFile.id,
        thumbnailId: fileUploaded.thumbnailFile?.id,
        buffer: undefined,
        version: 1,
        txns: fileUploaded.originalFile.txns,
        thumbnailTxns: fileUploaded.thumbnailFile?.txns,
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

  async getById(id: string, options: FileOptions, userInfo: UserInfo): Promise<any> {
    // TODO Check if it's possible to get the transaction only to avoid load all transactions
    this.logger.silly('Get all files and find record');
    // TODO Check if it's possible to get the transaction only to avoid load all transactions
    const files = await this.getAll(userInfo);
    const record = files.records.find(file => file.id === id);

    assert(record, CustomError.create('File not found', ErrorCode.NOT_FOUND))

    this.logger.silly(`Get storage`);
    const { account: address, passphrase, publicKey } = await this.storage.get(userInfo);
    const { server } = ApiConfig.mainAccount;

    this.logger.silly(`Create jupiter instance`);
    // const options = {server, address, passphrase, encryptSecret: userInfo.password, publicKey, feeNQT: ApiConfig.minimumFee};
    const uploader = JupiterFs({
      server,
      address,
      passphrase,
      encryptSecret: userInfo.password,
      feeNQT: ApiConfig.minimumFee,
      minimumFndrAccountBalance: ApiConfig.minBalance,
      minimumUserAccountBalance: ApiConfig.minBalance,
      fundingAmount: ApiConfig.mainAccount.fundingAmount,
      publicKey
    });

    this.logger.silly('Get JupiterFS file');
    let buffer;
    try {
      const isImage = record?.file_record?.mimetype?.includes('image');
      if(isImage){
        switch (options.type) {
          case ImageType.raw:
            buffer = await uploader.getFile({id: record.file_record.fileId});
            break;
          case ImageType.thumb:
            if(record.file_record.thumbnailId){
              buffer = await uploader.getFile({id: record.file_record.thumbnailId});
            } else {
              buffer = await uploader.getFile({id: record.file_record.fileId});
            }
            break;
        }
      } else {
        buffer = await uploader.getFile({id: record.file_record.fileId});
      }
    } catch (error) {
      throw JupiterError.parseJupiterResponseError(error);
    }

    this.logger.silly('Checking image type');

    try{
      buffer = this.decryptFile(buffer, userInfo.password, ApiConfig.algorithm);
    } catch (error){
      throw JupiterError.parseJupiterResponseError(error);
    }

    return {...record.file_record, buffer};
  }

  private async processImageBuffer(buffer: Buffer, options: FileOptions): Promise<Buffer> {
    this.logger.silly('Validate image type');
    assert(
      Object.values(ImageType).includes(options.type),
      CustomError.create('Image type not supported', ErrorCode.GENERAL)
    );

    switch (options.type) {
      case ImageType.raw:
        return buffer;
      case ImageType.thumb:
        return this.imageProcessor.resizeThumb(buffer);
    }
  }

  private async uploadFileWithJupiterFs(file: Express.Multer.File, userInfo: UserInfo) {
    this.logger.silly(`##################################`)
    this.logger.silly(`## uploadFileWithJupiterFs()`);
    this.logger.silly(`##`)

    // if(!file.filename){
    //   throw new Error('filename is missing');
    // }

    const { account: address, passphrase, publicKey } = await this.storage.get(userInfo);
    const { server } = ApiConfig.mainAccount;

    this.logger.silly(`Create new JupiterFS instance`);
    this.logger.silly(`storage account address=${address}`)

    const uploader = JupiterFs({
      server,
      address,
      passphrase,
      encryptSecret: userInfo.password,
      feeNQT: ApiConfig.minimumFee,
      minimumFndrAccountBalance: ApiConfig.minBalance,
      minimumUserAccountBalance: ApiConfig.minBalance,
      fundingAmount: ApiConfig.mainAccount.fundingAmount,
      publicKey
    });

    const { balanceNQT: clientBalance } = await uploader.client.getBalance(address);
    this.logger.silly(`Client Account Balance: ${clientBalance} , Client: ${address}`);

    if ( parseInt(clientBalance) < parseInt(ApiConfig.mainAccount.fundingAmount)) {
      this.logger.silly('This client account needs funds. Sending funds to account...');
      //@TODO the jim should not fund account, money need to come from the sender
      const { data: { transaction } } = await gravity.sendMoney(address, ApiConfig.mainAccount.fundingAmount);
      await this.transactionChecker.waitForConfirmation(transaction);
    }
    this.logger.silly('Upload file to Jupiter');
    try {
      if (!userInfo.password){
        throw new Error('[uploadFileWithJupiterFs]: Password needs to be set');
      }

      const buffer = this.encryptFile(file.buffer, userInfo.password, ApiConfig.algorithm);
      const originalFile =  await uploader.writeFile(file.filename, buffer);

      const isImage = file?.mimetype?.includes('image');
      if(isImage) {
        const thumbnail_buffer = await this.imageProcessor.resizeThumb(file.buffer);
        const thumbnailFile =  await uploader.writeFile(file.filename, this.encryptFile(thumbnail_buffer, userInfo.password, ApiConfig.algorithm));
        return {originalFile, thumbnailFile};
      }
      return {originalFile};
    } catch (error) {
      this.logger.error('[Write File]:' + JSON.stringify(error))
      throw JupiterError.parseJupiterResponseError(error);
    }
  }

  /**
   * Encrypt the buffer file
   * @param buffer
   * @param password
   * @param algorithm
   */
  public encryptFile(buffer: Buffer, password: string, algorithm: string){
    // Create an initialization vector
    const iv = crypto.randomBytes(16);
    const key = crypto.createHash('sha256').update(password).digest('base64').substr(0, 32);

    // Create a new cipher using the algorithm, key, and iv
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    // Create the new (encrypted) buffer
    return Buffer.concat([iv, cipher.update(buffer), cipher.final()]);
  };

  /**
   * Decrypt the buffer file
   * @param buffer
   * @param password
   * @param algorithm
   */
  public decryptFile(buffer: Buffer, password: string, algorithm: string){
    // Get the iv: the first 16 bytes
    const iv = buffer.slice(0, 16);
    const key = crypto.createHash('sha256').update(password).digest('base64').substr(0, 32);

    // Get the rest
    buffer = buffer.slice(16);
    // Create a decipher
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    // Actually decrypt it
    return Buffer.concat([decipher.update(buffer), decipher.final()]);
  };
}

