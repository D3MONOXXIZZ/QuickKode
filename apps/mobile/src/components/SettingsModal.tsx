import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import type { BYOKConfig } from '@quickkode/shared';

export interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  config: BYOKConfig;
  onSave: (config: BYOKConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose, config, onSave }) => {
  const [serverUrl, setServerUrl] = useState(config.orchestratorServerUrl ?? 'ws://192.168.1.80:4000');
  const [e2bKey, setE2bKey] = useState(config.e2bApiKey ?? '');
  const [geminiKey, setGeminiKey] = useState(config.geminiApiKey ?? '');
  const [deepseekKey, setDeepseekKey] = useState(config.deepseekApiKey ?? '');
  const [anthropicKey, setAnthropicKey] = useState(config.anthropicApiKey ?? '');
  const [openAiKey, setOpenAiKey] = useState(config.openAiApiKey ?? '');
  const [githubToken, setGithubToken] = useState(config.githubToken ?? '');
  const [driveFolderId, setDriveFolderId] = useState(config.googleDriveFolderId ?? '');
  const [pcAccountConnected, setPcAccountConnected] = useState(config.antigravityAuthType === 'pc_account');

  useEffect(() => {
    setServerUrl(config.orchestratorServerUrl ?? 'ws://192.168.1.80:4000');
    setE2bKey(config.e2bApiKey ?? '');
    setGeminiKey(config.geminiApiKey ?? '');
    setDeepseekKey(config.deepseekApiKey ?? '');
    setAnthropicKey(config.anthropicApiKey ?? '');
    setOpenAiKey(config.openAiApiKey ?? '');
    setGithubToken(config.githubToken ?? '');
    setDriveFolderId(config.googleDriveFolderId ?? '');
    setPcAccountConnected(config.antigravityAuthType === 'pc_account');
  }, [config, visible]);

  const handleSave = () => {
    onSave({
      antigravityAuthType: pcAccountConnected ? 'pc_account' : 'api_key',
      orchestratorServerUrl: serverUrl.trim() || 'ws://192.168.1.80:4000',
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
              <Text style={styles.title}>Environment & Keys</Text>
              <Text style={styles.headerSubtitle}>Configured on-device for all your projects</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* 1. Orchestrator Server URL */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌐 Cloud Orchestrator Server</Text>
              <Text style={styles.sectionSubtitle}>
                The WebSocket server powering agent sandboxes, terminal commands, and live previews.
              </Text>
              <Text style={styles.inputLabel}>WebSocket Endpoint</Text>
              <TextInput
                style={styles.input}
                placeholder="ws://192.168.1.80:4000 or wss://..."
                placeholderTextColor="#8E918F"
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* 2. E2B Sandbox MicroVMs */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📦 E2B Isolated Sandboxes</Text>
              <Text style={styles.sectionSubtitle}>
                Executes code, compiles packages, and runs test suites inside 300ms cloud microVMs.
              </Text>
              <Text style={styles.inputLabel}>E2B API Key (from e2b.dev)</Text>
              <TextInput
                style={styles.input}
                placeholder="e2b_..."
                placeholderTextColor="#8E918F"
                value={e2bKey}
                onChangeText={setE2bKey}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* 3. Antigravity & Gemini Core */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✦ Google Antigravity & Gemini</Text>
              <Text style={styles.sectionSubtitle}>
                Delegate directly to your PC Antigravity quota or provide a Gemini API key.
              </Text>

              <TouchableOpacity
                style={[styles.accountConnectBtn, pcAccountConnected && styles.accountConnectedBtn]}
                onPress={() => setPcAccountConnected(!pcAccountConnected)}
              >
                <Text style={styles.accountConnectText}>
                  {pcAccountConnected ? '✓ PC Account Delegated (No API Key Required)' : 'Use Antigravity PC Quota'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Gemini API Key (Optional Fallback)</Text>
              <TextInput
                style={styles.input}
                placeholder="AIzaSy..."
                placeholderTextColor="#8E918F"
                value={geminiKey}
                onChangeText={setGeminiKey}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* 4. OpenCode Models (BYOK) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚡ OpenCode Multi-Model (BYOK)</Text>
              <Text style={styles.sectionSubtitle}>
                Bring your own keys for DeepSeek, Claude, or GPT-4o.
              </Text>

              <Text style={styles.inputLabel}>DeepSeek API Key (DeepSeek-Coder-V2 / R1)</Text>
              <TextInput
                style={styles.input}
                placeholder="sk-..."
                placeholderTextColor="#8E918F"
                value={deepseekKey}
                onChangeText={setDeepseekKey}
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Anthropic API Key (Claude 3.5 Sonnet)</Text>
              <TextInput
                style={styles.input}
                placeholder="sk-ant-..."
                placeholderTextColor="#8E918F"
                value={anthropicKey}
                onChangeText={setAnthropicKey}
                secureTextEntry
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>OpenAI API Key (GPT-4o)</Text>
              <TextInput
                style={styles.input}
                placeholder="sk-proj-..."
                placeholderTextColor="#8E918F"
                value={openAiKey}
                onChangeText={setOpenAiKey}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* 5. GitHub Integration */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🐙 GitHub Integration</Text>
              <Text style={styles.sectionSubtitle}>
                Allows the agent to clone private repos, create branches, and push approved commits.
              </Text>
              <Text style={styles.inputLabel}>GitHub Personal Access Token (PAT)</Text>
              <TextInput
                style={styles.input}
                placeholder="ghp_..."
                placeholderTextColor="#8E918F"
                value={githubToken}
                onChangeText={setGithubToken}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* 6. Google Drive Sync */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📁 Google Drive Differential Sync</Text>
              <Text style={styles.sectionSubtitle}>
                Two-way delta sync between your cloud sandbox and Google Drive with .driveignore protection.
              </Text>
              <Text style={styles.inputLabel}>Google Drive Target Folder ID</Text>
              <TextInput
                style={styles.input}
                placeholder="1a2b3c4d5e6f..."
                placeholderTextColor="#8E918F"
                value={driveFolderId}
                onChangeText={setDriveFolderId}
                autoCapitalize="none"
              />
            </View>
          </ScrollView>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
              <Text style={styles.submitBtnText}>Save & Apply</Text>
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
    backgroundColor: '#1E1F20',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    color: '#E3E3E3',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#8E918F',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: '#8E918F',
    fontSize: 18,
  },
  scroll: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#2B2D30',
    paddingBottom: 20,
  },
  sectionTitle: {
    color: '#A8C7FA',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#8E918F',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  inputLabel: {
    color: '#C4C7C5',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#131314',
    borderWidth: 1,
    borderColor: '#3C4043',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#E3E3E3',
    fontSize: 14,
  },
  accountConnectBtn: {
    backgroundColor: '#282A2C',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3C4043',
    marginBottom: 8,
  },
  accountConnectedBtn: {
    backgroundColor: '#1E3A2F',
    borderColor: '#34A853',
  },
  accountConnectText: {
    color: '#A8C7FA',
    fontSize: 13,
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#282A2C',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#E3E3E3',
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 2,
    backgroundColor: '#004A77',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#D3E3FD',
    fontSize: 14,
    fontWeight: '700',
  },
});
