import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BYOKConfig } from '@quickkode/shared';
import type { UserProfile } from '../types/client';

const STORAGE_KEY_CONFIG = '@quickkode:user_config_v1';
const STORAGE_KEY_ONBOARDING = '@quickkode:onboarding_completed_v1';
const STORAGE_KEY_USER = '@quickkode:user_profile_v1';

export const DEFAULT_BYOK_CONFIG: BYOKConfig = {
  antigravityAuthType: 'pc_account',
  orchestratorServerUrl: 'ws://192.168.1.80:4000',
};

export class SettingsStorage {
  static async loadConfig(): Promise<BYOKConfig> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_CONFIG);
      if (raw) {
        return { ...DEFAULT_BYOK_CONFIG, ...JSON.parse(raw) };
      }
    } catch (err) {
      console.warn('[SettingsStorage] Error loading user config:', err);
    }
    return DEFAULT_BYOK_CONFIG;
  }

  static async saveConfig(config: BYOKConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (err) {
      console.error('[SettingsStorage] Error saving user config:', err);
    }
  }

  static async hasCompletedOnboarding(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEY_ONBOARDING);
      return val === 'true';
    } catch {
      return false;
    }
  }

  static async setOnboardingCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_ONBOARDING, 'true');
    } catch (err) {
      console.warn('[SettingsStorage] Error setting onboarding:', err);
    }
  }

  static async loadUser(): Promise<UserProfile | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_USER);
      if (raw) return JSON.parse(raw);
    } catch (err) {
      console.warn('[SettingsStorage] Error loading user profile:', err);
    }
    return null;
  }

  static async saveUser(user: UserProfile | null): Promise<void> {
    try {
      if (!user) {
        await AsyncStorage.removeItem(STORAGE_KEY_USER);
      } else {
        await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      }
    } catch (err) {
      console.error('[SettingsStorage] Error saving user profile:', err);
    }
  }
}
