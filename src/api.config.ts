export const ApiConfig: any = {
  jupiterFs: {
    server: process.env.JUPITER_SERVER,
  },
  imageResize: {
    thumb: {
      width: 100,
      height: 100,
      fit: 'cover',
    },
  },
  jwtSecret: process.env.JWT_SECRET,
};
