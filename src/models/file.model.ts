import { FileAccount, FileProps } from '../interfaces/file-props';
import { logger } from '../services/logger.service';

const Model = require('../utils/metis/_model');

export class File extends Model {

  constructor(data: FileProps = {}) {
    data = {...data, ...data.metadata, metadata: undefined};
    // Sets model name and table name
    super({
      data,
      model: 'file',
      table: 'storage',
      belongsTo: 'channel',
      model_params: [
        'id', 'fileId', 'jupiter-fs', 'fieldname', 'originalname', 'encoding', 'mimetype', 'size', 'version', 'fileSize', 'txns'
      ],
    });

    this.public_key = data.public_key;

    // Mandatory method to be called after data
    this.record = this.setRecord();
  }

  loadRecords(accessData: any) {
    return super.loadRecords(accessData);
  }

  /**
   *
   */
  async create() {
    logger.silly('###############################33')
    logger.silly('## File.create()')
    logger.silly('## ')

    if (!this.accessLink) {
      return Promise.reject({error: true, message: 'Missing user information'});
    }
    return super.create(this.accessLink);
  }
}
