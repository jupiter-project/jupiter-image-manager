import { Logger as TsLogger } from 'tslog';
import { ApiConfig } from '../api.config';

export class Logger extends TsLogger {
  constructor() {
    // TODO Define settings for logging
    super({minLevel: ApiConfig.loggerLevel});

  }
}

export const logger = new Logger();
