import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet } from 'react-native';

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
          <Text style={styles.title}>Pull from GitHub</Text>
          <Text style={styles.subtitle}>Enter any public or private repository name to clone directly into cloud storage.</Text>

          <Text style={styles.inputLabel}>Repository Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. octocat/Hello-World"
            placeholderTextColor="#8E918F"
            value={repo}
            onChangeText={(t) => {
              setRepo(t);
              setError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.inputLabel}>Branch (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="main (default)"
            placeholderTextColor="#8E918F"
            value={branch}
            onChangeText={setBranch}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1E1F20',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333538',
  },
  title: {
    color: '#E3E3E3',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#8E918F',
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  inputLabel: {
    color: '#C4C7C5',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#131314',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#E3E3E3',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#3C4043',
    marginBottom: 16,
  },
  errorText: {
    color: '#EA4335',
    fontSize: 12,
    marginBottom: 12,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
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
