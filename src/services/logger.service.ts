import { Logger as TsLogger } from 'tslog';
import { ApiConfig } from '../api.config';
const Log = require('../models/log.model');

export class Logger extends TsLogger {
  constructor() {
    // TODO Define settings for logging
    super({minLevel: ApiConfig.loggerLevel});

    const mongoose = require('mongoose');
    mongoose.connect('mongodb+srv://admin:P@ssw0rd@metiscluster.nc3vp.mongodb.net/jim-dev?retryWrites=true&w=majority', {useNewUrlParser: true, useUnifiedTopology: true});
  }

  public logToMongo(data: {account: any, payload: any, action: any}) {
    const a = {...data, rs: data.account?.account};
    const log = new Log(a);
    log.save().then();
  }
}
