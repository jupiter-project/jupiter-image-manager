import { Logger } from './logger.service';
import { Inject } from 'typescript-ioc';
import { gravity } from '../utils/metis/gravity';
import { UserInfo } from '../interfaces/auth-api-request';
import { Storage } from '../interfaces/storage';
import { CustomError } from '../utils/custom.error';
import { ErrorCode } from '../enums/error-code.enum';

const TABLE_NAME = 'storage';

export class StorageService {
  private logger: Logger;

  constructor(@Inject logger: Logger) {
    this.logger = logger;
  }

  async get(userInfo: UserInfo): Promise<Storage> {
    const {database, hasStorage} = await this.getStorageBreakdown(userInfo);

    if (!hasStorage) {
      throw CustomError.create('Storage not found', ErrorCode.NOT_FOUND)
    }

    this.logger.silly('Extract storage table');
    const { address, passphrase } = gravity.getTableData(TABLE_NAME, database.app.tables);
    const storageExtra = await gravity.getAccountInformation(passphrase);

    return {account: address, passphrase, accountId: storageExtra.accountId, publicKey: storageExtra.publicKey};
  }


  async create(userInfo: UserInfo): Promise<Storage> {
    const {account, database, tableBreakdown, hasStorage} = await this.getStorageBreakdown(userInfo);

    this.logger.silly('Check if has storage');
    if (hasStorage) {
      throw CustomError.create('Storage already created');
    }

    this.logger.silly('Creating new storage');
    const { message } = await gravity.attachTable(account, TABLE_NAME, tableBreakdown);
    this.logger.silly(message);

    this.logger.silly('Extract storage table');
    const { address, passphrase } = gravity.getTableData(TABLE_NAME, database.app.tables);
    const storageExtra = await gravity.getAccountInformation(passphrase);

    return {account: address, passphrase, accountId: storageExtra.accountId, publicKey: storageExtra.publicKey};
  }

  async getStorageBreakdown(userInfo: UserInfo) {
    this.logger.silly('Extract extra user info');
    const {accountId, publicKey} = await gravity.getAccountInformation(userInfo.passphrase);

    this.logger.silly('Complete user info');
    const account = {...userInfo, accountId, publicKey, encryptionPassword: userInfo.password};

    this.logger.silly('Load database');
    const database = await gravity.loadAppData(account);
    const tableBreakdown = gravity.tableBreakdown(database.app.tables);
    const hasStorage = gravity.hasTable(database.app.tables, TABLE_NAME);

    return {account, database, tableBreakdown, hasStorage};
  }
}
