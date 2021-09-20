import { gravity } from '../utils/metis/gravity';
import { Logger } from './logger.service';
import { Inject } from 'typescript-ioc';
import { File } from '../models/file.model';
import { UserInfo } from '../interfaces/auth-api-request';
import { ApiConfig } from '../api.config';
import { JupiterError } from '../utils/jupiter-error';
import JupiterFs from '../utils/jupiter-fs';
import { RecordsResponse } from '../interfaces/records-response';
import assert from 'assert';
import { CustomError } from '../utils/custom.error';
import { ErrorCode } from '../enums/error-code.enum';
import { StorageService } from './storage.service';
import { FileProps } from '../interfaces/file-props';
import { TransactionChecker } from './transaction-checker.service';

export class FileService {
  private logger: Logger;
  private storage: StorageService;
  private transactionChecker: TransactionChecker;

  constructor(@Inject logger: Logger, @Inject storage: StorageService, @Inject transactionChecker: TransactionChecker) {
    this.logger = logger;
    this.storage = storage;
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
      publicKey
    });

    this.logger.silly('Get JupiterFS file');
    try {
      const buffer = await uploader.getFile({id: record.file_record.fileId});

      return {...record.file_record, buffer};
    } catch (error) {
      throw JupiterError.parseJupiterResponseError(error);
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
      publicKey
    });
    this.logger.silly('Check if have money');


    const { balanceNQT } = await uploader.client.getBalance(address);
    this.logger.silly(`account balance: ${balanceNQT}`)
    if ( parseInt(balanceNQT) < parseInt(ApiConfig.minBalance)) {
      this.logger.silly('This account needs funds. Sending funds to account');
      const { data: { transaction } } = await gravity.sendMoney(address, ApiConfig.minBalance );
      await this.transactionChecker.waitForConfirmation(transaction);
    }
    this.logger.silly('Upload file to Jupiter');
    try {
      this.logger.silly(`uploader.writeFile(filename=${file.filename}, buffer`)

      return await uploader.writeFile(file.filename, file.buffer);
    } catch (error) {
      this.logger.silly(`error=${error}`)
      throw JupiterError.parseJupiterResponseError(error);
    }
  }
}

