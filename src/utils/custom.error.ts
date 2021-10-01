import { ErrorCode } from '../enums/error-code.enum';

export class CustomError extends Error {
  message: string;
  code: number;

  private constructor(message: string, code: number) {
    super();

    this.message = message;
    this.code = code;
  }

  // TODO implement correctly ErrorCode enum
  static create(message: string, code: number): CustomError {
    return new CustomError(message, code);
  }
}
