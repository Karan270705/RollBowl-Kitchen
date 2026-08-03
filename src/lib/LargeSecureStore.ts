import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

class LargeSecureStore {
  private async _encrypt(key: string, value: string) {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch (e) {}
      return;
    }
    const MAX_CHUNK_SIZE = 2000;
    const numChunks = Math.ceil(value.length / MAX_CHUNK_SIZE);

    await SecureStore.setItemAsync(`${key}_chunk_count`, numChunks.toString());

    for (let i = 0; i < numChunks; i++) {
      const chunk = value.substring(
        i * MAX_CHUNK_SIZE,
        (i + 1) * MAX_CHUNK_SIZE
      );
      await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk);
    }
  }

  private async _decrypt(key: string) {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    }
    const numChunksStr = await SecureStore.getItemAsync(`${key}_chunk_count`);
    if (!numChunksStr) {
      return await SecureStore.getItemAsync(key);
    }

    const numChunks = parseInt(numChunksStr, 10);
    let fullString = '';

    for (let i = 0; i < numChunks; i++) {
      const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
      if (chunk) {
        fullString += chunk;
      }
    }

    return fullString;
  }

  async getItem(key: string) {
    return await this._decrypt(key);
  }

  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch (e) {}
      return;
    }
    const numChunksStr = await SecureStore.getItemAsync(`${key}_chunk_count`);
    if (numChunksStr) {
      const numChunks = parseInt(numChunksStr, 10);
      for (let i = 0; i < numChunks; i++) {
        await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
      }
      await SecureStore.deleteItemAsync(`${key}_chunk_count`);
    }
    await SecureStore.deleteItemAsync(key);
  }
  
  async setItem(key: string, value: string) {
    await this._encrypt(key, value);
  }
}

export const largeSecureStore = new LargeSecureStore();
