import { NextApiResponse } from 'next';
import { JupiterError } from '../utils/jupiter-error';

export class ErrorHandler {

  process(error: { message: string }, res: NextApiResponse) {
    if (error instanceof TypeError) {
      return res.status(400).json({ message: error.message });
    } else if (error instanceof JupiterError) {
      return res.status(error.code).json({ message: error.message });
    } else {
      return res.status(500).json({ message: error.message });
    }
  }
}
