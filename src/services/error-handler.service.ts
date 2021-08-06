import { NextApiResponse } from 'next';
import { JupiterError } from '../utils/jupiter-error';
import { CustomError } from '../utils/custom.error';
import { Inject } from 'typescript-ioc';
import { Logger } from './logger.service';

export class ErrorHandler {
  private logger: Logger;

  constructor(@Inject logger: Logger) {
    this.logger = logger;
  }

  process(error: any, res: NextApiResponse) {
    this.logger.error(error);

    if (error instanceof TypeError) {
      return res.status(400).json({ message: error.message });
    } else if (error instanceof JupiterError) {
      return res.status(error.code).json({ message: error.message });
    } else if (error instanceof CustomError) {
      return res.status(400).json({ message: error.message, code: error.code });
    } else {
      return res.status(500).json(error);
    }
  }
}
