import * as Keychain from 'react-native-keychain';

import { TOKEN_SERVICE } from './config';

export async function readSessionToken(): Promise<string | null> {
  const credentials = await Keychain.getGenericPassword({
    service: TOKEN_SERVICE,
  });
  return credentials ? credentials.password : null;
}

export async function saveSessionToken(token: string): Promise<void> {
  await Keychain.setGenericPassword('session', token, {
    service: TOKEN_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearSessionToken(): Promise<void> {
  await Keychain.resetGenericPassword({ service: TOKEN_SERVICE });
}
