import { Logger } from './logger.service';
import { Inject } from 'typescript-ioc';
import { gravity } from '../utils/metis/gravity';
import { UserInfo } from '../interfaces/auth-api-request';

const TABLE_NAME = 'storage';

export default class StorageService {
  private logger: Logger;

  constructor(@Inject logger: Logger) {
    this.logger = logger;
  }

  async findOrCreate(userInfo: UserInfo) {
    // Extract extra user info
    const {accountId, publicKey} = await gravity.getAccountInformation(userInfo.passphrase);

    // Complete user info
    const account = {...userInfo, accountId, publicKey, encryptionPassword: userInfo.password};

    // Load database
    const database = await gravity.loadAppData(account);
    const tableBreakdown = gravity.tableBreakdown(database.app.tables);
    const hasTable = gravity.hasTable(database.app.tables, TABLE_NAME);

    // Create table if not exists
    if (!hasTable) {
      const attached = await gravity.attachTable(account, TABLE_NAME, tableBreakdown);
      console.log(attached);
    }

    return gravity.getTableData(TABLE_NAME, database.app.tables);
  }
}
