import type { NextApiResponse } from 'next'
import multer from 'multer';
import nextConnect from 'next-connect';
import {MulterRequest} from '../../interfaces/multer-request';

type Data = {
  data?: string;
  error?: string
}

// Returns a Multer instance that provides several methods for generating
// middleware that process files uploaded in multipart/form-data format.
const upload = multer({storage: multer.memoryStorage()});

const uploadMiddleware = upload.single('image');

const apiRoute = nextConnect({
  // Handle any other HTTP method
  onNoMatch(req: MulterRequest, res: NextApiResponse<Data>) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

apiRoute.use(uploadMiddleware);

// Process a POST request
apiRoute.post((req, res) => {
  console.warn(req.file.buffer);
  res.status(200).json({ data: 'success' });
});

export default apiRoute;

export const config = {
  api: {
    bodyParser: false, // Disallow body parsing, consume as stream
  },
};
