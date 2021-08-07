export const ApiConfig: any = {
  jupiterServer: process.env.JUPITER_SERVER,
  imageResize: {
    thumb: {
      width: 100,
      height: 100,
      fit: 'cover',
    },
  },
  jwtSecret: process.env.JWT_SECRET,
  maxMbSize: process.env.MAX_FILE_SIZE_MB || 1,
  sleepTime: process.env.JUPITER_SLEEP_SEC || 35,
  feeMultiplier: process.env.FEE_MULTIPLIER || 1.5,
  httpProtocol: process.env.NODE_ENV === 'production' ? 'https' : 'http',
};
