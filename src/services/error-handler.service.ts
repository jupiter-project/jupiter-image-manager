import { NextApiResponse } from 'next';

export class ErrorHandler {

  process(error: { message: string }, res: NextApiResponse) {
    if (error instanceof TypeError) {
      return res.status(400).json({ message: error.message });
    } else {
      return res.status(500).json({ message: error.message });
    }
  }
}
