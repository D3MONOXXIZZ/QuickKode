import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import type { ExecutionMode, ActiveModelConfig } from '@quickkode/shared';

export interface PromptBarProps {
  onSend: (prompt: string) => void;
  isLoading: boolean;
  activeModel: ActiveModelConfig;
  executionMode: ExecutionMode;
  onToggleMode: () => void;
  onOpenModelSelector: () => void;
}

export const PromptBar: React.FC<PromptBarProps> = ({
  onSend,
  isLoading,
  activeModel,
  executionMode,
  onToggleMode,
  onOpenModelSelector,
}) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim() || isLoading) return;
    onSend(text.trim());
    setText('');
  };

  const isTurbo = executionMode === 'turbo';
  const modelLabel =
    activeModel.provider === 'antigravity'
      ? 'Antigravity (PC)'
      : activeModel.modelName.replace('-coder', '').replace('-sonnet', '');

  return (
    <View style={styles.container}>
      {/* Control Pills: Model selector & Turbo mode toggle */}
      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.modelBadge} onPress={onOpenModelSelector} activeOpacity={0.7}>
          <Text style={styles.modelBadgeText}>✦ {modelLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.turboBadge, isTurbo ? styles.turboActive : styles.turboInactive]}
          onPress={onToggleMode}
          activeOpacity={0.7}
        >
          <Text style={[styles.turboText, isTurbo ? styles.turboTextActive : styles.turboTextInactive]}>
            ⚡ Turbo: {isTurbo ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Gemini Capsule Input Bar */}
      <View style={styles.capsule}>
        <TextInput
          style={styles.input}
          placeholder="Ask Antigravity or OpenCode..."
          placeholderTextColor="#8E918F"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={4000}
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[styles.sendButton, text.trim().length > 0 && !isLoading ? styles.sendActive : styles.sendDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: '#131314',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  modelBadge: {
    backgroundColor: '#282A2C',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3C4043',
  },
  modelBadgeText: {
    color: '#D3E3FD',
    fontSize: 12,
    fontWeight: '600',
  },
  turboBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  turboActive: {
    backgroundColor: '#1E3A2F',
    borderColor: '#34A853',
  },
  turboInactive: {
    backgroundColor: '#282A2C',
    borderColor: '#5F6368',
  },
  turboText: {
    fontSize: 11,
    fontWeight: '700',
  },
  turboTextActive: {
    color: '#34A853',
  },
  turboTextInactive: {
    color: '#9AA0A6',
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1F20',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#3C4043',
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 52,
  },
  input: {
    flex: 1,
    color: '#E3E3E3',
    fontSize: 15,
    paddingVertical: 8,
    maxHeight: 120,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendActive: {
    backgroundColor: '#A8C7FA',
  },
  sendDisabled: {
    backgroundColor: '#3C4043',
  },
  sendIcon: {
    color: '#041E49',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
