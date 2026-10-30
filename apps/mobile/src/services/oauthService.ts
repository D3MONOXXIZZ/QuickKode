import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import type { UserProfile } from '../types/client';
import { SettingsStorage } from './storage';

WebBrowser.maybeCompleteAuthSession();

export class OAuthService {
  /**
   * Prompts user for 1-tap GitHub OAuth login
   */
  static async signInWithGitHub(
    serverUrl = 'http://192.168.1.80:4000',
    clientId?: string,
  ): Promise<UserProfile | null> {
    const redirectUrl = makeRedirectUri({
      scheme: 'quickkode',
      path: 'auth/github',
    });

    try {
      let authUrl = `${serverUrl.replace('ws', 'http')}/auth/github?redirect_uri=${encodeURIComponent(redirectUrl)}`;
      if (clientId) {
        authUrl += `&client_id=${encodeURIComponent(clientId)}`;
      }

      const authResult = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (authResult.type === 'success' && authResult.url) {
        const urlParams = new URL(authResult.url);
        const error = urlParams.searchParams.get('error');
        if (error) {
          throw new Error(`GitHub OAuth error: ${error}`);
        }

        const token = urlParams.searchParams.get('token');
        const username = urlParams.searchParams.get('username') || 'developer';
        const name = urlParams.searchParams.get('name') || username;
        const email = urlParams.searchParams.get('email') || undefined;
        const avatarUrl = urlParams.searchParams.get('avatar_url') || undefined;

        if (token) {
          const profile: UserProfile = {
            id: `gh-${username}`,
            provider: 'github',
            displayName: name,
            username,
            email,
            avatarUrl,
            token,
            createdAt: new Date().toISOString(),
          };
          await SettingsStorage.saveUser(profile);
          return profile;
        }
      }
    } catch (err) {
      console.warn('[OAuthService] GitHub WebBrowser flow:', err);
      throw err;
    }

    return null;
  }

  /**
   * Prompts user for 1-tap Google OAuth login (Drive & Antigravity)
   */
  static async signInWithGoogle(
    serverUrl = 'http://192.168.1.80:4000',
    clientId?: string,
  ): Promise<UserProfile | null> {
    const redirectUrl = makeRedirectUri({
      scheme: 'quickkode',
      path: 'auth/google',
    });

    try {
      let authUrl = `${serverUrl.replace('ws', 'http')}/auth/google?redirect_uri=${encodeURIComponent(redirectUrl)}`;
      if (clientId) {
        authUrl += `&client_id=${encodeURIComponent(clientId)}`;
      }

      const authResult = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (authResult.type === 'success' && authResult.url) {
        const urlParams = new URL(authResult.url);
        const error = urlParams.searchParams.get('error');
        if (error) {
          throw new Error(`Google OAuth error: ${error}`);
        }

        const token = urlParams.searchParams.get('token');
        const email = urlParams.searchParams.get('email') || 'user@gmail.com';
        const name = urlParams.searchParams.get('name') || 'Google User';
        const avatarUrl = urlParams.searchParams.get('avatar_url') || undefined;

        if (token) {
          const profile: UserProfile = {
            id: `goog-${email}`,
            provider: 'google',
            displayName: name,
            email,
            avatarUrl,
            token,
            createdAt: new Date().toISOString(),
          };
          await SettingsStorage.saveUser(profile);
          return profile;
        }
      }
    } catch (err) {
      console.warn('[OAuthService] Google WebBrowser flow:', err);
      throw err;
    }

    return null;
  }

  /**
   * Clears saved user authentication state
   */
  static async signOut(): Promise<void> {
    await SettingsStorage.saveUser(null);
  }
}
