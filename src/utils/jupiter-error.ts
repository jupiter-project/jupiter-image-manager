export class JupiterError extends Error {
  code: number;
  message: string;

  constructor(code: number, message: string) {
    super();

    this.code = code;
    this.message = message;
  }

  public static parseJupiterResponseError(error: Error): JupiterError {
    let jupiterError = {
      errorDescription : 'Something went wrong, please try again.',
      errorCode: 500
    };

    if(!!error?.message){
      try {
        jupiterError = JSON.parse(error.message);
      } catch (error){
       console.log('Error while parsing error.!');
      }
    }
    const code = this.getHttpCodeForJupiterErrorCode(jupiterError?.errorCode)

    return new JupiterError(code, jupiterError?.errorDescription);
  }

  private static getHttpCodeForJupiterErrorCode(jupiterCode: number) {
    switch (jupiterCode) {
      case 6:
        return 402;
      default:
        return 500;
    }
  }
}
