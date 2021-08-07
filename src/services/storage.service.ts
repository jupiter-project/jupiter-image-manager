import { Logger } from './logger.service';
import { Inject } from 'typescript-ioc';
import { gravity } from '../utils/metis/gravity';
import { UserInfo } from '../interfaces/auth-api-request';
import { Storage } from '../interfaces/storage';

const TABLE_NAME = 'storage';

export class StorageService {
  private logger: Logger;

  constructor(@Inject logger: Logger) {
    this.logger = logger;
  }

  async findOrCreate(userInfo: UserInfo): Promise<Storage> {
    this.logger.silly('Extract extra user info');
    const {accountId, publicKey} = await gravity.getAccountInformation(userInfo.passphrase);

    this.logger.silly('Complete user info');
    const account = {...userInfo, accountId, publicKey, encryptionPassword: userInfo.password};

    this.logger.silly('Load database');
    const database = await gravity.loadAppData(account);
    const tableBreakdown = gravity.tableBreakdown(database.app.tables);
    const hasTable = gravity.hasTable(database.app.tables, TABLE_NAME);

    this.logger.silly('Send funds to account');
    await gravity.sendMoney(account.account);

    this.logger.silly('Check if has storage');
    if (!hasTable) {
      this.logger.silly('Storage not found. Creating new storage');
      const { message } = await gravity.attachTable(account, TABLE_NAME, tableBreakdown);
      this.logger.silly(message);

      return this.findOrCreate(userInfo);
    }

    this.logger.silly('Extract storage table');
    const { address, passphrase } = gravity.getTableData(TABLE_NAME, database.app.tables);
    const storageExtra = await gravity.getAccountInformation(passphrase);

    return {account: address, passphrase, accountId: storageExtra.accountId, publicKey: storageExtra.publicKey};
  }
}
