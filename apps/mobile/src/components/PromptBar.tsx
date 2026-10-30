import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import type { ExecutionMode, ActiveModelConfig } from '@quickkode/shared';
import { theme } from '../theme';

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
  const hasOAuth = Boolean(
    activeModel.provider === 'antigravity' &&
    (activeModel.authType === 'oauth' || Boolean(activeModel.oauthToken)),
  );
  const hasKey = Boolean(
    hasOAuth ||
    (activeModel.provider === 'antigravity' && activeModel.geminiApiKey) ||
    (activeModel.provider === 'opencode' && activeModel.apiKey),
  );

  const modelLabel = hasOAuth
    ? 'Google OAuth (Active)'
    : hasKey
    ? activeModel.provider === 'antigravity'
      ? 'Gemini 2.0 Flash'
      : activeModel.modelName.replace('-coder-v2', '').replace('-3-5-sonnet', '')
    : 'Configure AI / Sign In';

  const hasText = text.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Top Floating Mini Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[
            styles.modelBadge,
            hasOAuth && styles.modelBadgeOAuth,
            !hasKey && styles.modelBadgeWarning,
          ]}
          onPress={onOpenModelSelector}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.sparkIcon,
              hasOAuth && styles.sparkIconOAuth,
              !hasKey && styles.sparkIconWarning,
            ]}
          >
            {hasOAuth ? '🌐' : hasKey ? '✦' : '⚠️'}
          </Text>
          <Text
            style={[
              styles.modelBadgeText,
              hasOAuth && styles.modelBadgeTextOAuth,
              !hasKey && styles.modelBadgeTextWarning,
            ]}
          >
            {modelLabel}
          </Text>
          <Text style={styles.dropdownChevron}>⌄</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.turboBadge, isTurbo ? styles.turboActive : styles.turboInactive]}
          onPress={onToggleMode}
          activeOpacity={0.7}
        >
          <View style={[styles.modeDot, isTurbo ? styles.dotActive : styles.dotInactive]} />
          <Text style={[styles.turboText, isTurbo ? styles.turboTextActive : styles.turboTextInactive]}>
            {isTurbo ? '⚡ Turbo Mode' : '🛡️ Standard Mode'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Gemini Capsule Input Container */}
      <View style={styles.capsule}>
        <TextInput
          style={styles.input}
          placeholder="Ask Antigravity or describe a code change..."
          placeholderTextColor={theme.colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={4000}
          editable={!isLoading}
          textAlignVertical="center"
        />

        {hasText && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => setText('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.sendButton,
            hasText && !isLoading ? styles.sendActive : styles.sendDisabled,
          ]}
          onPress={handleSend}
          disabled={!hasText || isLoading}
          activeOpacity={0.8}
        >
          <Text style={[styles.sendIcon, hasText && !isLoading && styles.sendIconActive]}>
            {isLoading ? '⏳' : '➤'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xs,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: theme.colors.bgBase,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgSurface,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  modelBadgeOAuth: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  modelBadgeWarning: {
    backgroundColor: theme.colors.accentAmberDim,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  sparkIcon: {
    color: theme.colors.accentPrimaryLight,
    fontSize: 12,
    marginRight: 5,
  },
  sparkIconOAuth: {
    color: '#60A5FA',
  },
  sparkIconWarning: {
    color: theme.colors.accentAmber,
  },
  modelBadgeText: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  modelBadgeTextOAuth: {
    color: '#93C5FD',
    fontWeight: '700',
  },
  modelBadgeTextWarning: {
    color: theme.colors.accentAmber,
    fontWeight: '700',
  },
  dropdownChevron: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginLeft: 6,
    marginBottom: 2,
  },
  turboBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    borderWidth: 1,
  },
  turboActive: {
    backgroundColor: theme.colors.accentEmeraldDim,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  turboInactive: {
    backgroundColor: theme.colors.accentAmberDim,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  modeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotActive: {
    backgroundColor: theme.colors.accentEmerald,
  },
  dotInactive: {
    backgroundColor: theme.colors.accentAmber,
  },
  turboText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  turboTextActive: {
    color: theme.colors.accentEmerald,
  },
  turboTextInactive: {
    color: theme.colors.accentAmber,
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgCapsule,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: theme.colors.borderMedium,
    paddingHorizontal: 14,
    paddingVertical: 4,
    minHeight: 52,
  },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 8,
    maxHeight: 110,
  },
  clearBtn: {
    padding: 6,
    marginRight: 4,
  },
  clearBtnText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  sendActive: {
    backgroundColor: theme.colors.accentPrimary,
    shadowColor: theme.colors.accentPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  sendDisabled: {
    backgroundColor: theme.colors.bgCardHover,
  },
  sendIcon: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginLeft: 2,
  },
  sendIconActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
