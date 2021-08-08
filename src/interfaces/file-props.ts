
export interface FileProps {
  id?: string;
  public_key?: string;
  user_address?: string;
  metadata?: {
    fieldname: string,
    originalname: string,
    encoding: string,
    mimetype: string,
    size: number,
    version: number,
    public: boolean,
  };
}

export interface FileAccount {
  address: string;
  passphrase: string;
  password?: string;
  publicKey: string
}
