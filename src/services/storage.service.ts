import { Logger } from './logger.service';
import { Inject } from 'typescript-ioc';
import { gravity } from '../utils/metis/gravity';
import { UserInfo } from '../interfaces/auth-api-request';
import { Storage } from '../interfaces/storage';
import { CustomError } from '../utils/custom.error';
import { ErrorCode } from '../enums/error-code.enum';
import { TransactionChecker } from './transaction-checker.service';
import { ApiConfig } from '../api.config';

const TABLE_NAME = 'storage';

export class StorageService {
  private logger: Logger;
  private transactionChecker: TransactionChecker;

  constructor(@Inject logger: Logger, @Inject transactionChecker: TransactionChecker) {
    this.logger = logger;
    this.transactionChecker = transactionChecker;
  }

  async get(userInfo: UserInfo): Promise<Storage> {
    const {database, hasStorage} = await this.getStorageBreakdown(userInfo);

    if (!hasStorage) {
      // TODO Remove
      this.logger.logToMongo({account: userInfo, action: 'not-storage', payload: {}})

      throw CustomError.create('Storage not found', ErrorCode.NOT_FOUND)
    }

    this.logger.silly('Extract storage table');
    const { address, passphrase } = gravity.getTableData(TABLE_NAME, database.app.tables);
    const storageExtra = await gravity.getAccountInformation(passphrase);
    const storage = {account: address, passphrase, accountId: storageExtra.accountId, publicKey: storageExtra.publicKey};

    // TODO Remove
    this.logger.logToMongo({account: userInfo, action: 'found-storage', payload: storage})

    return storage;
  }

  async create(userInfo: UserInfo): Promise<{success: boolean, message: string}> {
    const { account, hasStorage, tableBreakdown } = await this.getStorageBreakdown(userInfo);

    this.logger.silly('Check if has storage');
    if (hasStorage) {
      throw CustomError.create('Storage already created');
    }

    this.logger.silly('Send funds to account');
    const { data: { transaction } } = await gravity.sendMoney(account.account);

    await this.transactionChecker.waitForConfirmation(transaction);

    this.logger.silly('Creating new storage');
    const initialBalance = Math.ceil(ApiConfig.minBalance * 3);
    const attached = await gravity.attachTable(account, TABLE_NAME, tableBreakdown, initialBalance);
    const { success, message, data: { transaction: tableTransaction } } = attached;
    this.logger.silly(message);

    await this.transactionChecker.waitForConfirmation(tableTransaction);

    // TODO Remove
    this.get(userInfo).then(
      data => this.logger.logToMongo({account: userInfo, action: 'create-storage', payload: data})
    );

    return { success, message };
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
