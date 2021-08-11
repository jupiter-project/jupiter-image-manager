export interface RecordsResponse {
  success: boolean;
  records: Record[];
  records_found: number;
}

export interface Record {
  id: string;
  file_record: Metadata;
  date: number;
}

export interface Metadata {
  id: string;
  fileId: string;
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  version: number;
  "jupiter-fs": boolean;
  fileSize: number;
  txns: string;
}
