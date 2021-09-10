import { ApiConfig } from '../api.config';

export function calculateMessageFee(encryptedMessageLength: number): number {
  const base = 180000;

  if (!encryptedMessageLength) {
    return 500
  } else if (encryptedMessageLength <= 5000) {
    return base;
  }

  const x = base * 2 * encryptedMessageLength / 10000

  return Math.ceil(x * ApiConfig.feeMultiplier);
}

export async function sleep(milliseconds = 1000) {
  return await new Promise((resolve) => setTimeout(resolve, milliseconds))
}
