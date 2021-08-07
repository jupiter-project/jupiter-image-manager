export interface RecordsResponse {
  success: boolean;
  records: Record[];
  records_found: number;
}

export interface Record {
  id: string;
  file_record: FileRecord;
  date: number;
}

export interface FileRecord {
  id: string;
  account: string;
  passphrase: string;
  password: string;
  publicKey: string;
  metadata: Metadata;
  date: number;
  confirmed: boolean;
}

export interface Metadata {
  id: string;
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
