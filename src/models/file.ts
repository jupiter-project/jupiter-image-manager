import { FileAccount, FileProps } from '../interfaces/file-props';
const Model = require('../utils/metis/_model');

export class File extends Model {
  constructor(data: FileProps = {}) {
    // Sets model name and table name
    super({
      data,
      model: 'file',
      table: 'storage',
      belongsTo: 'channel',
      model_params: [
        'id', 'account', 'passphrase', 'password', 'publicKey', 'metadata'
      ],
    });

    this.public_key = data.public_key;

    // Mandatory method to be called after data
    this.record = this.setRecord();
  }

  loadRecords(accessData: any) {
    return super.loadRecords(accessData);
  }

  async create(fileAccount: FileAccount) {
    if (!this.accessLink || !fileAccount) {
      return Promise.reject({error: true, message: 'Missing user information'});
    }

    this.record.passphrase = fileAccount.passphrase;
    this.record.password = fileAccount.password;
    this.data.passphrase = fileAccount.passphrase;
    this.data.password = fileAccount.password;

    this.record.account = fileAccount.address;
    this.record.publicKey = fileAccount.publicKey;
    this.data.account = fileAccount.address;
    this.data.publicKey = fileAccount.publicKey;

    return super.create(this.accessLink);
  }
}
