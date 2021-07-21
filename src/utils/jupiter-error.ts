export class JupiterError extends Error {
  code: number;
  message: string;

  constructor(code: number, message: string) {
    super();

    this.code = code;
    this.message = message;
  }

  public static parseJupiterResponseError(error: Error): JupiterError {
    const jupiterError = JSON.parse(error.message);
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
