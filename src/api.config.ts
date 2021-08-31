export const ApiConfig: any = {
  imageResize: {
    thumb: {
      width: 100,
      height: 100,
      fit: 'cover',
    },
  },
  jwtSecret: process.env.JWT_SECRET,
  maxMbSize: process.env.MAX_FILE_SIZE_MB || 1,
  feeMultiplier: 1.2,
  host: process.env.HOST,
  loggerLevel: process.env.LOGGER_LEVEL || 'silly',
  mainAccount: {
    server: process.env.JUPITER_SERVER,
    address: process.env.APP_ADDRESS,
    passphrase: process.env.APP_PASSPHRASE,
    encryptSecret: process.env.ENCRYPT_PASSWORD,
    publicKey: process.env.APP_PUBLIC_KEY,
  },
  minBalance: process.env.MIN_BALANCE || 30000000,
};
