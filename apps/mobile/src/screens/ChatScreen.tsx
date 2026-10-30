import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import type { ChatMessage, ActiveModelConfig, ExecutionMode, ActivePreview } from '@quickkode/shared';
import { PromptBar } from '../components/PromptBar';
import { ThoughtWidget } from '../components/ThoughtWidget';

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
  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.agentRow]}>
        {!isUser && <Text style={styles.agentAvatar}>✦</Text>}

        <View style={[styles.bubble, isUser ? styles.userBubble : styles.agentBubble]}>
          {/* Agent collapsible thoughts */}
          {!isUser && item.thoughts && item.thoughts.length > 0 && (
            <ThoughtWidget thoughts={item.thoughts} isStreaming={isLoading} />
          )}

          <Text style={styles.messageText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.projectName} numberOfLines={1}>
            {projectName}
          </Text>
          <TouchableOpacity onPress={onReconnect} disabled={isConnected}>
            <Text style={[styles.sessionStatus, !isConnected && styles.sessionStatusOffline]}>
              {isConnected ? '🟢 Active Cloud Session' : '🟠 Offline (Tap to Reconnect)'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onOpenFileTree}>
            <Text style={styles.actionBtnText}>📁 Files</Text>
          </TouchableOpacity>

          {hasDiffs && (
            <TouchableOpacity style={[styles.actionBtn, styles.diffBtn]} onPress={onOpenDiffs}>
              <Text style={styles.diffBtnText}>⌥ Diffs</Text>
            </TouchableOpacity>
          )}

          {activePreview && (
            <TouchableOpacity style={styles.previewBtn} onPress={() => onOpenPreview(activePreview)}>
              <Text style={styles.previewBtnText}>▶ Preview</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Message Feed */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
    backgroundColor: '#131314',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#282A2C',
    backgroundColor: '#131314',
  },
  menuBtn: {
    padding: 8,
    marginRight: 10,
  },
  menuIcon: {
    color: '#E3E3E3',
    fontSize: 20,
  },
  headerTitleContainer: {
    flex: 1,
  },
  projectName: {
    color: '#E3E3E3',
    fontSize: 15,
    fontWeight: '700',
  },
  sessionStatus: {
    color: '#34A853',
    fontSize: 11,
    marginTop: 1,
  },
  sessionStatusOffline: {
    color: '#FBBC04',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    backgroundColor: '#282A2C',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3C4043',
  },
  actionBtnText: {
    color: '#E3E3E3',
    fontSize: 12,
    fontWeight: '600',
  },
  diffBtn: {
    backgroundColor: '#3C2B1C',
    borderColor: '#FBBC04',
  },
  diffBtnText: {
    color: '#FBBC04',
    fontSize: 12,
    fontWeight: '700',
  },
  previewBtn: {
    backgroundColor: '#1E3A2F',
    borderWidth: 1,
    borderColor: '#34A853',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  previewBtnText: {
    color: '#34A853',
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
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
  agentAvatar: {
    color: '#A8C7FA',
    fontSize: 18,
    marginRight: 8,
    marginTop: 8,
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#282A2C',
    borderBottomRightRadius: 4,
  },
  agentBubble: {
    backgroundColor: '#1E1F20',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#2B2D30',
  },
  messageText: {
    color: '#E3E3E3',
    fontSize: 14,
    lineHeight: 20,
  },
});
