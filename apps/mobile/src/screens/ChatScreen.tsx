import React, { useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Clipboard } from 'react-native';
import type { ChatMessage, ActiveModelConfig, ExecutionMode, ActivePreview } from '@quickkode/shared';
import { PromptBar } from '../components/PromptBar';
import { ThoughtWidget } from '../components/ThoughtWidget';
import { theme } from '../theme';

export interface ChatScreenProps {
  projectName: string;
  messages: ChatMessage[];
  activeModel: ActiveModelConfig;
  executionMode: ExecutionMode;
  isLoading: boolean;
  isConnected?: boolean;
  activePreview?: ActivePreview | null;
  hasDiffs?: boolean;
  onSendPrompt: (prompt: string) => void;
  onToggleTurboMode: () => void;
  onOpenSidebar: () => void;
  onOpenModelSelector: () => void;
  onOpenPreview: (preview: ActivePreview) => void;
  onOpenFileTree: () => void;
  onOpenDiffs: () => void;
  onReconnect?: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  projectName,
  messages,
  activeModel,
  executionMode,
  isLoading,
  isConnected = false,
  activePreview,
  hasDiffs,
  onSendPrompt,
  onToggleTurboMode,
  onOpenSidebar,
  onOpenModelSelector,
  onOpenPreview,
  onOpenFileTree,
  onOpenDiffs,
  onReconnect,
}) => {
  const flatListRef = useRef<FlatList>(null);

  const promptSuggestions = [
    { title: '⚡ Add OAuth Login', prompt: 'Add 1-tap Google and GitHub OAuth authentication flow' },
    { title: '📦 Scaffold API Endpoints', prompt: 'Create Express backend endpoints for user profile and settings' },
    { title: '🧪 Run Test Suite', prompt: 'Run all unit and integration tests and verify 100% pass rate' },
    { title: '🎨 Polish Mobile UI', prompt: 'Overhaul component styling with modern dark theme and responsive layout' },
  ];

  const renderContentWithCodeBlocks = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const lang = lines[0]?.match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : '';
        const codeText = (lang ? lines.slice(1) : lines).join('\n');

        return (
          <View key={index} style={styles.codeBlockContainer}>
            <View style={styles.codeBlockHeader}>
              <Text style={styles.codeBlockLang}>{lang || 'CODE'}</Text>
              <TouchableOpacity
                onPress={() => {
                  if (Clipboard?.setString) {
                    Clipboard.setString(codeText);
                  }
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.copyButtonText}>📋 Copy</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.codeBlockText}>{codeText}</Text>
          </View>
        );
      }

      return (
        <Text key={index} style={styles.messageText}>
          {part}
        </Text>
      );
    });
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const timeFormatted = item.timestamp
      ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.agentRow]}>
        {!isUser && (
          <View style={styles.agentAvatarContainer}>
            <Text style={styles.agentAvatarSpark}>✦</Text>
          </View>
        )}

        <View style={[styles.bubble, isUser ? styles.userBubble : styles.agentBubble]}>
          {/* Agent collapsible thoughts & tools */}
          {!isUser && item.thoughts && item.thoughts.length > 0 && (
            <ThoughtWidget thoughts={item.thoughts} isStreaming={isLoading} />
          )}

          {renderContentWithCodeBlocks(item.content)}

          {timeFormatted ? (
            <Text style={[styles.messageTime, isUser ? styles.userTime : styles.agentTime]}>
              {timeFormatted}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  const showHero = messages.length === 0;

  return (
    <View style={styles.screen}>
      {/* Top Frosted Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={onOpenSidebar}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.projectName} numberOfLines={1}>
              {projectName}
            </Text>
            <View style={styles.branchPill}>
              <Text style={styles.branchText}>🌿 main</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.statusRow}
            onPress={onReconnect}
            disabled={isConnected}
            activeOpacity={0.7}
          >
            <View style={[styles.statusDot, isConnected ? styles.dotOnline : styles.dotOffline]} />
            <Text style={[styles.sessionStatus, !isConnected && styles.sessionStatusOffline]}>
              {isConnected ? 'Active MicroVM' : 'Offline (Tap to Reconnect)'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onOpenFileTree}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>📁 Files</Text>
          </TouchableOpacity>

          {hasDiffs && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.diffBtn]}
              onPress={onOpenDiffs}
              activeOpacity={0.7}
            >
              <Text style={styles.diffBtnText}>⌥ Diffs</Text>
            </TouchableOpacity>
          )}

          {activePreview && (
            <TouchableOpacity
              style={styles.previewBtn}
              onPress={() => onOpenPreview(activePreview)}
              activeOpacity={0.7}
            >
              <Text style={styles.previewBtnText}>▶ Live</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Message Feed / Interactive Empty Hero */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={
          showHero ? (
            <View style={styles.heroContainer}>
              <View style={styles.heroSparkContainer}>
                <Text style={styles.heroSpark}>✦</Text>
              </View>
              <Text style={styles.heroTitle}>QuickKode AI Workspace</Text>
              <Text style={styles.heroSubtitle}>
                Cloud-native microVM with Antigravity & OpenCode. What are we building next?
              </Text>

              <View style={styles.suggestionsGrid}>
                {promptSuggestions.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionCard}
                    onPress={() => onSendPrompt(item.prompt)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestionTitle}>{item.title}</Text>
                    <Text style={styles.suggestionPrompt} numberOfLines={2}>
                      {item.prompt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : undefined
        }
      />

      {/* Bottom Gemini Capsule Prompt Bar */}
      <PromptBar
        onSend={onSendPrompt}
        isLoading={isLoading}
        activeModel={activeModel}
        executionMode={executionMode}
        onToggleMode={onToggleTurboMode}
        onOpenModelSelector={onOpenModelSelector}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.bgSurface,
  },
  menuBtn: {
    padding: 6,
    marginRight: 8,
    borderRadius: theme.radius.sm,
  },
  menuIcon: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  projectName: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  branchPill: {
    backgroundColor: theme.colors.bgCardHover,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.radius.sm,
  },
  branchText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  dotOnline: {
    backgroundColor: theme.colors.accentEmerald,
  },
  dotOffline: {
    backgroundColor: theme.colors.accentAmber,
  },
  sessionStatus: {
    color: theme.colors.accentEmerald,
    fontSize: 11,
    fontWeight: '600',
  },
  sessionStatusOffline: {
    color: theme.colors.accentAmber,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    backgroundColor: theme.colors.bgCard,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  actionBtnText: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  diffBtn: {
    backgroundColor: theme.colors.accentAmberDim,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  diffBtnText: {
    color: theme.colors.accentAmber,
    fontSize: 11,
    fontWeight: '700',
  },
  previewBtn: {
    backgroundColor: theme.colors.accentEmeraldDim,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  previewBtnText: {
    color: theme.colors.accentEmerald,
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  agentRow: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  agentAvatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.accentPrimaryDim,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  agentAvatarSpark: {
    color: theme.colors.accentPrimaryLight,
    fontSize: 14,
  },
  bubble: {
    maxWidth: '84%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#26223B',
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  agentBubble: {
    backgroundColor: theme.colors.bgSurface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  messageText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 6,
    textAlign: 'right',
  },
  userTime: {
    color: theme.colors.accentPrimaryLight,
    opacity: 0.7,
  },
  agentTime: {
    color: theme.colors.textMuted,
  },
  codeBlockContainer: {
    backgroundColor: theme.colors.bgBase,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginVertical: 6,
    overflow: 'hidden',
  },
  codeBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.bgCardHover,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  codeBlockLang: {
    color: theme.colors.accentCyan,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: theme.fonts.code,
  },
  copyButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  codeBlockText: {
    color: '#E0E7FF',
    fontFamily: theme.fonts.code,
    fontSize: 12,
    lineHeight: 18,
    padding: 10,
  },
  heroContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
    paddingHorizontal: theme.spacing.sm,
  },
  heroSparkContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.accentPrimaryDim,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroSpark: {
    color: theme.colors.accentPrimaryLight,
    fontSize: 24,
  },
  heroTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    maxWidth: 280,
  },
  suggestionsGrid: {
    width: '100%',
    marginTop: 20,
    gap: 8,
  },
  suggestionCard: {
    backgroundColor: theme.colors.bgSurface,
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  suggestionTitle: {
    color: theme.colors.accentPrimaryLight,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  suggestionPrompt: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
});
