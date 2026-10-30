import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import type { BYOKConfig } from '@quickkode/shared';

export interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  config: BYOKConfig;
  onSave: (config: BYOKConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose, config, onSave }) => {
  const [deepseekKey, setDeepseekKey] = useState(config.deepseekApiKey ?? '');
  const [anthropicKey, setAnthropicKey] = useState(config.anthropicApiKey ?? '');
  const [githubToken, setGithubToken] = useState(config.githubToken ?? '');
  const [pcAccountConnected, setPcAccountConnected] = useState(config.antigravityAuthType === 'pc_account');

  const handleSave = () => {
    onSave({
      antigravityAuthType: pcAccountConnected ? 'pc_account' : 'api_key',
      deepseekApiKey: deepseekKey.trim() || undefined,
      anthropicApiKey: anthropicKey.trim() || undefined,
      githubToken: githubToken.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Settings & BYOK</Text>

          <ScrollView style={styles.scroll}>
            {/* 1. Antigravity Native Account Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✦ Google Antigravity</Text>
              <Text style={styles.sectionSubtitle}>
                Sign in with your Google Antigravity account to use your PC subscription quota directly. No API key required.
              </Text>

              <TouchableOpacity
                style={[styles.accountConnectBtn, pcAccountConnected && styles.accountConnectedBtn]}
                onPress={() => setPcAccountConnected(!pcAccountConnected)}
              >
                <Text style={styles.accountConnectText}>
                  {pcAccountConnected ? '✓ Antigravity PC Account Connected' : 'Sign In with Antigravity (PC Account)'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 2. OpenCode Models (BYOK) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚡ OpenCode API Keys (BYOK)</Text>
              <Text style={styles.sectionSubtitle}>
                Keys are encrypted on your device and sent only during active coding sessions.
              </Text>

              <Text style={styles.inputLabel}>DeepSeek API Key (DeepSeek-Coder / R1)</Text>
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
          </ScrollView>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
              <Text style={styles.submitBtnText}>Save Settings</Text>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1E1F20',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#333538',
  },
  title: {
    color: '#E3E3E3',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  scroll: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#131314',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2B2D30',
  },
  sectionTitle: {
    color: '#A8C7FA',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#8E918F',
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  accountConnectBtn: {
    backgroundColor: '#282A2C',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3C4043',
  },
  accountConnectedBtn: {
    backgroundColor: '#1E3A2F',
    borderColor: '#34A853',
  },
  accountConnectText: {
    color: '#E3E3E3',
    fontSize: 13,
    fontWeight: '600',
  },
  inputLabel: {
    color: '#C4C7C5',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#1E1F20',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#E3E3E3',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#3C4043',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 10,
  },
  cancelBtnText: {
    color: '#C4C7C5',
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#A8C7FA',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  submitBtnText: {
    color: '#041E49',
    fontSize: 14,
    fontWeight: '700',
  },
});
