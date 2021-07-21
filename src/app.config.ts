export const AppConfig: any = {
  jupiterFs: {
    server: process.env.SERVER,
    address: process.env.ADDRESS,
    passphrase: process.env.PASSPHRASE,
  },
  imageResize: {
    thumb: {
      width: 100,
      height: 100,
      fit: 'cover',
    },
  },
};