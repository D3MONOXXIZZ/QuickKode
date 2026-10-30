import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import type { ClientProject, ChatThread, DrawerViewMode } from '../types/client';
import type { ActiveModelConfig } from '@quickkode/shared';

export interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeModel: ActiveModelConfig;
  activeProjectId: string;
  activeSessionId: string;
  threads: ChatThread[];
  projects: ClientProject[];
  onSelectThread: (threadId: string) => void;
  onSelectProject: (projectId: string) => void;
  onNewChat: () => void;
  onOpenGitHubImport: () => void;
  onOpenSettings: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeModel,
  activeProjectId,
  activeSessionId,
  threads,
  projects,
  onSelectThread,
  onSelectProject,
  onNewChat,
  onOpenGitHubImport,
  onOpenSettings,
}) => {
  const [viewMode, setViewMode] = useState<DrawerViewMode>('chats');

  if (!isOpen) return null;

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === 'chats' ? 'projects' : 'chats'));
  };

  const modelTitle =
    activeModel.provider === 'antigravity'
      ? '⚡ Gemini Antigravity (PC)'
      : `✦ OpenCode (${activeModel.modelName})`;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

      <View style={styles.drawer}>
        {/* Top: Morphing Model Badge */}
        <TouchableOpacity style={styles.modelHeaderPill} onPress={toggleViewMode} activeOpacity={0.8}>
          <View style={styles.modelPillTopRow}>
            <Text style={styles.modelPillTitle} numberOfLines={1}>
              {modelTitle}
            </Text>
            <Text style={styles.modelPillSwitchIcon}>⇄</Text>
          </View>
          <Text style={styles.modelPillSubtitle}>
            {viewMode === 'chats' ? 'Switch to Project Navigator' : 'Switch to Chat Threads'}
          </Text>
        </TouchableOpacity>

        {/* View Mode Indicator */}
        <View style={styles.viewModeTabs}>
          <TouchableOpacity
            style={[styles.tabButton, viewMode === 'chats' && styles.tabActive]}
            onPress={() => setViewMode('chats')}
          >
            <Text style={[styles.tabText, viewMode === 'chats' && styles.tabTextActive]}>Chats</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, viewMode === 'projects' && styles.tabActive]}
            onPress={() => setViewMode('projects')}
          >
            <Text style={[styles.tabText, viewMode === 'projects' && styles.tabTextActive]}>Projects</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Content: Chats vs Projects */}
        <ScrollView style={styles.listContainer}>
          {viewMode === 'chats' ? (
            <View>
              <TouchableOpacity style={styles.actionBtn} onPress={onNewChat}>
                <Text style={styles.actionBtnIcon}>+</Text>
                <Text style={styles.actionBtnText}>New Chat</Text>
              </TouchableOpacity>

              <Text style={styles.sectionHeader}>RECENT THREADS</Text>
              {threads.map((thread) => {
                const isSelected = thread.sessionId === activeSessionId;
                return (
                  <TouchableOpacity
                    key={thread.id}
                    style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                    onPress={() => onSelectThread(thread.id)}
                  >
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {thread.title}
                    </Text>
                    <Text style={styles.itemSubtitle}>
                      {thread.modelConfig.provider === 'antigravity' ? 'Antigravity' : 'OpenCode'} •{' '}
                      {new Date(thread.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View>
              <TouchableOpacity style={styles.actionBtn} onPress={onOpenGitHubImport}>
                <Text style={styles.actionBtnIcon}>⬇</Text>
                <Text style={styles.actionBtnText}>Pull from GitHub</Text>
              </TouchableOpacity>

              <Text style={styles.sectionHeader}>CONNECTED PROJECTS</Text>
              {projects.map((proj) => {
                const isSelected = proj.id === activeProjectId;
                const syncIcon = proj.syncStatus === 'in_sync' ? '🟢' : proj.syncStatus === 'syncing' ? '🔄' : '⚠️';
                return (
                  <TouchableOpacity
                    key={proj.id}
                    style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                    onPress={() => onSelectProject(proj.id)}
                  >
                    <View style={styles.projectRow}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {proj.name}
                      </Text>
                      <Text style={styles.syncIcon}>{syncIcon}</Text>
                    </View>
                    <Text style={styles.itemSubtitle}>
                      {proj.source === 'google_drive' ? 'Google Drive' : 'GitHub'} • {proj.activeBranch ?? 'main'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Bottom Drawer Bar: Settings & BYOK */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.settingsBtn} onPress={onOpenSettings}>
            <Text style={styles.settingsIcon}>⚙</Text>
            <Text style={styles.settingsText}>Settings & BYOK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  drawer: {
    width: '80%',
    maxWidth: 320,
    backgroundColor: '#1E1F20',
    height: '100%',
    paddingTop: 50,
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: '#333538',
  },
  modelHeaderPill: {
    backgroundColor: '#282A2C',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3C4043',
    marginBottom: 16,
  },
  modelPillTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modelPillTitle: {
    color: '#D3E3FD',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  modelPillSwitchIcon: {
    color: '#A8C7FA',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modelPillSubtitle: {
    color: '#8E918F',
    fontSize: 11,
    marginTop: 4,
  },
  viewModeTabs: {
    flexDirection: 'row',
    backgroundColor: '#131314',
    borderRadius: 8,
    padding: 3,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#282A2C',
  },
  tabText: {
    color: '#8E918F',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2B2D30',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  actionBtnIcon: {
    color: '#A8C7FA',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  actionBtnText: {
    color: '#E3E3E3',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    color: '#8E918F',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  listContainer: {
    flex: 1,
  },
  itemCard: {
    backgroundColor: '#191A1B',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2B2D30',
  },
  itemCardSelected: {
    borderColor: '#A8C7FA',
    backgroundColor: '#20242B',
  },
  projectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncIcon: {
    fontSize: 11,
  },
  itemTitle: {
    color: '#E3E3E3',
    fontSize: 13,
    fontWeight: '600',
  },
  itemSubtitle: {
    color: '#8E918F',
    fontSize: 11,
    marginTop: 3,
  },
  footer: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#2B2D30',
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingsIcon: {
    color: '#C4C7C5',
    fontSize: 16,
    marginRight: 10,
  },
  settingsText: {
    color: '#C4C7C5',
    fontSize: 14,
    fontWeight: '600',
  },
});
