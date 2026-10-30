import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { theme } from '../theme';

export interface GitHubImportModalProps {
  visible: boolean;
  onClose: () => void;
  onImport: (repoFullName: string, branch?: string) => void;
}

export const GitHubImportModal: React.FC<GitHubImportModalProps> = ({ visible, onClose, onImport }) => {
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const trimmed = repo.trim();
    if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(trimmed)) {
      setError('Please enter a valid format: owner/repository (e.g. facebook/react)');
      return;
    }

    setError(null);
    onImport(trimmed, branch.trim() || undefined);
    setRepo('');
    setBranch('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <Text style={styles.githubIcon}>🐙</Text>
              <Text style={styles.title}>Pull from GitHub</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Clone any public or private repository directly into the cloud microVM workspace.
          </Text>

          <Text style={styles.inputLabel}>REPOSITORY NAME (OWNER/REPO)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. facebook/react or D3MONOXXIZZ/QuickKode"
            placeholderTextColor={theme.colors.textMuted}
            value={repo}
            onChangeText={(t) => {
              setRepo(t);
              setError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.inputLabel}>TARGET BRANCH (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            placeholder="main (default)"
            placeholderTextColor={theme.colors.textMuted}
            value={branch}
            onChangeText={setBranch}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {error && <Text style={styles.errorText}>⚠️ {error}</Text>}

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.8}>
              <Text style={styles.submitBtnText}>Clone Project</Text>
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
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  githubIcon: {
    fontSize: 20,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  inputLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    backgroundColor: theme.colors.bgBase,
    color: theme.colors.textPrimary,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginBottom: 10,
  },
  errorText: {
    color: theme.colors.accentRose,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
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
