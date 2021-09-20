import { FileAccount, FileProps } from '../interfaces/file-props';
const Model = require('../utils/metis/_model');

export class File extends Model {
  constructor(data: FileProps = {}) {
    console.log('##############################')
    console.log('## File.constructor()')
    console.log('##')


    data = {...data, ...data.metadata, metadata: undefined};


  console.log(data);

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

  async create() {
    console.log('###############################33')
    console.log('## File.create()')
    console.log('## ')

    if (!this.accessLink) {
      return Promise.reject({error: true, message: 'Missing user information'});
    }

    console.log(this.accessLink);

    return super.create(this.accessLink);
  }
}
