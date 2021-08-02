export const ApiConfig: any = {
  jupiterFs: {
    server: process.env.SERVER,
    address: process.env.ADDRESS,
    passphrase: process.env.PASSPHRASE,
    encryptSecret: '123456',
  },
  imageResize: {
    thumb: {
      width: 100,
      height: 100,
      fit: 'cover',
    },
  },
};
