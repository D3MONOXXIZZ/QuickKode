import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import type { BYOKConfig } from '@quickkode/shared';
import type { UserProfile } from '../types/client';
import { theme } from '../theme';

export interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  config: BYOKConfig;
  onSave: (config: BYOKConfig) => void;
  userProfile?: UserProfile | null;
  onSignInGoogle?: () => Promise<void>;
  onSignOut?: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  config,
  onSave,
  userProfile,
  onSignInGoogle,
  onSignOut,
}) => {
  const [serverUrl, setServerUrl] = useState(config.orchestratorServerUrl ?? 'ws://192.168.1.80:4000');
  const [e2bKey, setE2bKey] = useState(config.e2bApiKey ?? '');
  const [geminiKey, setGeminiKey] = useState(config.geminiApiKey ?? '');
  const [googleClientId, setGoogleClientId] = useState(config.googleClientId ?? '');
  const [deepseekKey, setDeepseekKey] = useState(config.deepseekApiKey ?? '');
  const [anthropicKey, setAnthropicKey] = useState(config.anthropicApiKey ?? '');
  const [openAiKey, setOpenAiKey] = useState(config.openAiApiKey ?? '');
  const [githubToken, setGithubToken] = useState(config.githubToken ?? '');
  const [driveFolderId, setDriveFolderId] = useState(config.googleDriveFolderId ?? '');
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    setServerUrl(config.orchestratorServerUrl ?? 'ws://192.168.1.80:4000');
    setE2bKey(config.e2bApiKey ?? '');
    setGeminiKey(config.geminiApiKey ?? '');
    setGoogleClientId(config.googleClientId ?? '');
    setDeepseekKey(config.deepseekApiKey ?? '');
    setAnthropicKey(config.anthropicApiKey ?? '');
    setOpenAiKey(config.openAiApiKey ?? '');
    setGithubToken(config.githubToken ?? '');
    setDriveFolderId(config.googleDriveFolderId ?? '');
  }, [config, visible]);

  const isGoogleConnected = Boolean(
    (userProfile?.provider === 'google' && userProfile.token) ||
    config.googleOAuthToken,
  );

  const handleGoogleSignIn = async () => {
    if (!onSignInGoogle) return;
    setIsSigningIn(true);
    try {
      await onSignInGoogle();
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSave = () => {
    onSave({
      antigravityAuthType: isGoogleConnected ? 'oauth' : geminiKey.trim() ? 'api_key' : 'pc_account',
      orchestratorServerUrl: serverUrl.trim() || 'ws://192.168.1.80:4000',
      googleClientId: googleClientId.trim() || undefined,
      e2bApiKey: e2bKey.trim() || undefined,
      geminiApiKey: geminiKey.trim() || undefined,
      deepseekApiKey: deepseekKey.trim() || undefined,
      anthropicApiKey: anthropicKey.trim() || undefined,
      openAiApiKey: openAiKey.trim() || undefined,
      githubToken: githubToken.trim() || undefined,
      googleDriveFolderId: driveFolderId.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Environment & BYOK Center</Text>
              <Text style={styles.headerSubtitle}>Saved securely on this device for all sessions</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* 1. Orchestrator Server URL */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>🌐 Cloud Orchestrator</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>REQUIRED</Text>
                </View>
              </View>
              <Text style={styles.sectionSubtitle}>
                The WebSocket server powering agent sandboxes, terminal commands, and live previews.
              </Text>
              <Text style={styles.inputLabel}>WebSocket Endpoint</Text>
              <TextInput
                style={styles.input}
                placeholder="ws://192.168.1.80:4000 or wss://..."
                placeholderTextColor={theme.colors.textMuted}
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* 2. E2B Sandbox MicroVMs */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>📦 E2B Sandboxes (MicroVMs)</Text>
              <Text style={styles.sectionSubtitle}>
                Runs code execution, package installs, and test suites inside 300ms cloud microVMs.
              </Text>
              <Text style={styles.inputLabel}>E2B API Key (from e2b.dev)</Text>
              <TextInput
                style={styles.input}
                placeholder="e2b_..."
                placeholderTextColor={theme.colors.textMuted}
                value={e2bKey}
                onChangeText={setE2bKey}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* 3. Antigravity & Gemini Core */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>✦ Google Gemini & Drive Sync</Text>
                {isGoogleConnected && (
                  <View style={styles.sectionBadgeSuccess}>
                    <Text style={styles.sectionBadgeSuccessText}>CONNECTED</Text>
                  </View>
                )}
              </View>
              <Text style={styles.sectionSubtitle}>
                Sign in with your Google account to authorize Gemini AI and Drive code sync without an API key, or provide a direct API key.
              </Text>

              {/* Google OAuth Status / Action */}
              {isGoogleConnected ? (
                <View style={styles.googleConnectedBox}>
                  <View style={styles.googleUserRow}>
                    <Text style={styles.googleIcon}>🌐</Text>
                    <View style={styles.googleUserTextCol}>
                      <Text style={styles.googleUserName}>
                        {userProfile?.displayName || 'Google Account Connected'}
                      </Text>
                      <Text style={styles.googleUserEmail}>
                        {userProfile?.email || 'OAuth 2.0 Token Active'}
                      </Text>
                    </View>
                  </View>
                  {onSignOut && (
                    <TouchableOpacity
                      style={styles.googleSignOutBtn}
                      onPress={onSignOut}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.googleSignOutText}>Disconnect</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.googleSignInBtn, isSigningIn && styles.btnDisabled]}
                  onPress={handleGoogleSignIn}
                  disabled={isSigningIn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.googleSignInIcon}>🌐</Text>
                  <Text style={styles.googleSignInText}>
                    {isSigningIn ? 'Connecting to Google...' : 'Sign in with Google (OAuth 2.0)'}
                  </Text>
                </TouchableOpacity>
              )}

              <Text style={styles.inputLabel}>Google Cloud Client ID (Optional custom app)</Text>
              <TextInput
                style={styles.input}
                placeholder="...apps.googleusercontent.com"
                placeholderTextColor={theme.colors.textMuted}
                value={googleClientId}
                onChangeText={setGoogleClientId}
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Gemini API Key (Alternative Direct Key)</Text>
              <TextInput
                style={styles.input}
                placeholder="AIzaSy... (from aistudio.google.com)"
                placeholderTextColor={theme.colors.textMuted}
                value={geminiKey}
                onChangeText={setGeminiKey}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* 4. OpenCode Models (BYOK) */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>⚡ OpenCode Multi-Model (BYOK)</Text>
              <Text style={styles.sectionSubtitle}>
                Bring your own keys to unlock DeepSeek-Coder-V2, Claude 3.5 Sonnet, or GPT-4o.
              </Text>

              <Text style={styles.inputLabel}>DeepSeek API Key</Text>
              <TextInput
                style={styles.input}
                placeholder="sk-..."
                placeholderTextColor={theme.colors.textMuted}
                value={deepseekKey}
                onChangeText={setDeepseekKey}
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Anthropic API Key</Text>
              <TextInput
                style={styles.input}
                placeholder="sk-ant-..."
                placeholderTextColor={theme.colors.textMuted}
                value={anthropicKey}
                onChangeText={setAnthropicKey}
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>OpenAI API Key</Text>
              <TextInput
                style={styles.input}
                placeholder="sk-proj-..."
                placeholderTextColor={theme.colors.textMuted}
                value={openAiKey}
                onChangeText={setOpenAiKey}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* 5. GitHub Integration */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>🐙 GitHub Token</Text>
              <Text style={styles.sectionSubtitle}>
                Personal Access Token with repo scope for cloning and pushing code.
              </Text>
              <Text style={styles.inputLabel}>GitHub Personal Access Token (PAT)</Text>
              <TextInput
                style={styles.input}
                placeholder="ghp_..."
                placeholderTextColor={theme.colors.textMuted}
                value={githubToken}
                onChangeText={setGithubToken}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* 6. Google Drive Sync */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>📁 Google Drive Sync</Text>
              <Text style={styles.sectionSubtitle}>
                Delta sync between microVM and Google Drive with automatic .driveignore filters.
              </Text>
              <Text style={styles.inputLabel}>Google Drive Target Folder ID</Text>
              <TextInput
                style={styles.input}
                placeholder="1a2b3c4d5e6f..."
                placeholderTextColor={theme.colors.textMuted}
                value={driveFolderId}
                onChangeText={setDriveFolderId}
                autoCapitalize="none"
              />
            </View>
          </ScrollView>

          {/* Action Button Row */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSave} activeOpacity={0.8}>
              <Text style={styles.submitBtnText}>Save Configuration</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.bgSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 28,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  scroll: {
    marginBottom: 16,
  },
  sectionCard: {
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.radius.md,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sectionBadge: {
    backgroundColor: theme.colors.accentPrimaryDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
  },
  sectionBadgeText: {
    color: theme.colors.accentPrimaryLight,
    fontSize: 9,
    fontWeight: '700',
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  inputLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: theme.colors.bgBase,
    color: theme.colors.textPrimary,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  sectionBadgeSuccess: {
    backgroundColor: theme.colors.accentEmeraldDim,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
  },
  sectionBadgeSuccessText: {
    color: theme.colors.accentEmerald,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  googleConnectedBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: theme.radius.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  googleUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  googleIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  googleUserTextCol: {
    flex: 1,
  },
  googleUserName: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  googleUserEmail: {
    color: theme.colors.accentEmerald,
    fontSize: 11,
    marginTop: 1,
  },
  googleSignOutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.bgCard,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  googleSignOutText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  googleSignInBtn: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    marginBottom: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  googleSignInIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  googleSignInText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  accountConnectBtn: {
    backgroundColor: theme.colors.bgBase,
    borderWidth: 1,
    borderColor: theme.colors.borderMedium,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    marginBottom: 8,
  },
  accountConnectedBtn: {
    backgroundColor: theme.colors.accentEmeraldDim,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  accountConnectText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  accountConnectedText: {
    color: theme.colors.accentEmerald,
    fontWeight: '700',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: theme.colors.bgCardHover,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 2,
    backgroundColor: theme.colors.accentPrimary,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    shadowColor: theme.colors.accentPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
