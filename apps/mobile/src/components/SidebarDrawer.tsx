import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Image, StyleSheet } from 'react-native';
import type { ClientProject, ChatThread, DrawerViewMode, UserProfile } from '../types/client';
import type { ActiveModelConfig } from '@quickkode/shared';
import { theme } from '../theme';

export interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeModel: ActiveModelConfig;
  activeProjectId: string;
  activeSessionId: string;
  threads: ChatThread[];
  projects: ClientProject[];
  userProfile?: UserProfile | null;
  onSelectThread: (threadId: string) => void;
  onSelectProject: (projectId: string) => void;
  onNewChat: () => void;
  onOpenGitHubImport: () => void;
  onOpenSettings: () => void;
  onSignInGitHub?: () => void;
  onSignInGoogle?: () => void;
  onSignOut?: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeModel,
  activeProjectId,
  activeSessionId,
  threads,
  projects,
  userProfile,
  onSelectThread,
  onSelectProject,
  onNewChat,
  onOpenGitHubImport,
  onOpenSettings,
  onSignInGitHub,
  onSignInGoogle,
  onSignOut,
}) => {
  const [viewMode, setViewMode] = useState<DrawerViewMode>('chats');

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Backdrop touch area */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        {/* Sliding drawer panel */}
        <View style={styles.drawer}>
          {/* Top Brand Header */}
          <View style={styles.brandHeader}>
            <View style={styles.brandTitleRow}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoSpark}>✦</Text>
              </View>
              <View>
                <Text style={styles.brandName}>QuickKode</Text>
                <Text style={styles.brandVersion}>
                  v1.0 • {activeModel.provider === 'antigravity' ? 'Antigravity' : activeModel.modelName}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Segmented View Mode Tabs */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabButton, viewMode === 'chats' && styles.tabButtonActive]}
              onPress={() => setViewMode('chats')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, viewMode === 'chats' && styles.tabTextActive]}>
                💬 Chats ({threads.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, viewMode === 'projects' && styles.tabButtonActive]}
              onPress={() => setViewMode('projects')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, viewMode === 'projects' && styles.tabTextActive]}>
                📦 Projects ({projects.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Main List Content */}
          <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
            {viewMode === 'chats' ? (
              <View>
                <TouchableOpacity
                  style={styles.newChatBtn}
                  onPress={() => {
                    onNewChat();
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.newChatIcon}>+</Text>
                  <Text style={styles.newChatText}>New Coding Session</Text>
                </TouchableOpacity>

                <Text style={styles.sectionHeader}>RECENT SESSIONS</Text>
                {threads.map((thread) => {
                  const isSelected = thread.sessionId === activeSessionId;
                  const timeFormatted = thread.lastMessageAt
                    ? new Date(thread.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <TouchableOpacity
                      key={thread.id}
                      style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                      onPress={() => onSelectThread(thread.id)}
                      activeOpacity={0.7}
                    >
                      {isSelected && <View style={styles.selectedIndicator} />}
                      <View style={styles.itemContent}>
                        <Text style={[styles.itemTitle, isSelected && styles.itemTitleSelected]} numberOfLines={1}>
                          {thread.title}
                        </Text>
                        <View style={styles.metaRow}>
                          <View style={styles.modelTag}>
                            <Text style={styles.modelTagText}>
                              {thread.modelConfig.provider === 'antigravity' ? 'Antigravity' : 'OpenCode'}
                            </Text>
                          </View>
                          {timeFormatted ? <Text style={styles.itemTime}>{timeFormatted}</Text> : null}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View>
                <TouchableOpacity
                  style={styles.importBtn}
                  onPress={onOpenGitHubImport}
                  activeOpacity={0.8}
                >
                  <Text style={styles.importBtnIcon}>⬇</Text>
                  <Text style={styles.importBtnText}>Import from GitHub</Text>
                </TouchableOpacity>

                <Text style={styles.sectionHeader}>CONNECTED REPOSITORIES</Text>
                {projects.map((proj) => {
                  const isSelected = proj.id === activeProjectId;
                  const syncColor =
                    proj.syncStatus === 'in_sync'
                      ? theme.colors.accentEmerald
                      : proj.syncStatus === 'syncing'
                      ? theme.colors.accentAmber
                      : theme.colors.accentRose;

                  const syncLabel =
                    proj.syncStatus === 'in_sync'
                      ? 'In Sync'
                      : proj.syncStatus === 'syncing'
                      ? 'Syncing'
                      : 'Error';

                  return (
                    <TouchableOpacity
                      key={proj.id}
                      style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                      onPress={() => onSelectProject(proj.id)}
                      activeOpacity={0.7}
                    >
                      {isSelected && <View style={styles.selectedIndicator} />}
                      <View style={styles.itemContent}>
                        <View style={styles.projectTitleRow}>
                          <Text style={[styles.itemTitle, isSelected && styles.itemTitleSelected]} numberOfLines={1}>
                            {proj.name}
                          </Text>
                          <View style={[styles.syncBadge, { borderColor: syncColor }]}>
                            <View style={[styles.syncDot, { backgroundColor: syncColor }]} />
                            <Text style={[styles.syncBadgeText, { color: syncColor }]}>{syncLabel}</Text>
                          </View>
                        </View>

                        <View style={styles.metaRow}>
                          <Text style={styles.sourceText}>
                            {proj.source === 'google_drive' ? '☁️ Google Drive' : '🐙 GitHub'}
                          </Text>
                          <Text style={styles.branchText}>🌿 {proj.activeBranch ?? 'main'}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* User Account / 1-Tap OAuth Login Card */}
          <View style={styles.accountCard}>
            {userProfile ? (
              <View style={styles.userContainer}>
                <View style={styles.userProfileRow}>
                  {userProfile.avatarUrl ? (
                    <Image source={{ uri: userProfile.avatarUrl }} style={styles.userAvatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarFallbackText}>
                        {((userProfile.displayName || userProfile.email || 'U')[0] || 'U').toUpperCase()}
                      </Text>
                    </View>
                  )}

                  <View style={styles.userInfoCol}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {userProfile.displayName || userProfile.username || 'Developer'}
                    </Text>
                    <Text style={styles.userEmail} numberOfLines={1}>
                      {userProfile.email || `${userProfile.provider} account`}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.signOutBtn}
                    onPress={onSignOut}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.signOutText}>Exit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.oauthContainer}>
                <Text style={styles.oauthHeader}>SIGN IN TO SYNC CODE</Text>
                <View style={styles.oauthRow}>
                  <TouchableOpacity
                    style={styles.oauthBtnGithub}
                    onPress={onSignInGitHub}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.oauthBtnText}>🐙 GitHub</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.oauthBtnGoogle}
                    onPress={onSignInGoogle}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.oauthBtnText}>🌐 Google</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Quick Settings Action */}
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={onOpenSettings}
              activeOpacity={0.7}
            >
              <Text style={styles.settingsIcon}>⚙</Text>
              <Text style={styles.settingsText}>Settings & Model Keys</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  backdrop: {
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '82%',
    maxWidth: 340,
    backgroundColor: theme.colors.bgSurface,
    borderRightWidth: 1,
    borderRightColor: theme.colors.borderSubtle,
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 48,
    paddingBottom: 20,
    paddingHorizontal: 16,
    zIndex: 999,
    elevation: 20,
  },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.accentPrimaryDim,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSpark: {
    color: theme.colors.accentPrimaryLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  brandName: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  brandVersion: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
    borderRadius: theme.radius.sm,
  },
  closeBtnText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.bgBase,
    borderRadius: theme.radius.full,
    padding: 3,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: theme.radius.full,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: theme.colors.bgCardHover,
  },
  tabText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  scrollList: {
    flex: 1,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentPrimary,
    paddingVertical: 11,
    borderRadius: theme.radius.md,
    marginBottom: 16,
    shadowColor: theme.colors.accentPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  newChatIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 6,
  },
  newChatText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bgCard,
    borderWidth: 1,
    borderColor: theme.colors.borderMedium,
    paddingVertical: 11,
    borderRadius: theme.radius.md,
    marginBottom: 16,
  },
  importBtnIcon: {
    color: theme.colors.accentCyan,
    fontSize: 14,
    marginRight: 6,
  },
  importBtnText: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeader: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.radius.md,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    overflow: 'hidden',
  },
  itemCardSelected: {
    backgroundColor: '#1E1A33',
    borderColor: 'rgba(124, 58, 237, 0.4)',
  },
  selectedIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
    backgroundColor: theme.colors.accentPrimary,
  },
  itemContent: {
    flex: 1,
    paddingLeft: 4,
  },
  itemTitle: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemTitleSelected: {
    color: theme.colors.accentPrimaryLight,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modelTag: {
    backgroundColor: theme.colors.bgBase,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
  },
  modelTagText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  itemTime: {
    color: theme.colors.textMuted,
    fontSize: 10,
  },
  projectTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: theme.radius.full,
  },
  syncDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  syncBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  sourceText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  branchText: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  accountCard: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    paddingTop: 12,
    marginTop: 8,
  },
  userContainer: {
    backgroundColor: theme.colors.bgCard,
    padding: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginBottom: 8,
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  userInfoCol: {
    flex: 1,
  },
  userName: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  userEmail: {
    color: theme.colors.textMuted,
    fontSize: 10,
  },
  signOutBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.bgCardHover,
  },
  signOutText: {
    color: theme.colors.accentRose,
    fontSize: 10,
    fontWeight: '700',
  },
  oauthContainer: {
    marginBottom: 8,
  },
  oauthHeader: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
    marginLeft: 2,
  },
  oauthRow: {
    flexDirection: 'row',
    gap: 8,
  },
  oauthBtnGithub: {
    flex: 1,
    backgroundColor: '#24292E',
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  oauthBtnGoogle: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  oauthBtnText: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: theme.radius.sm,
  },
  settingsIcon: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    marginRight: 8,
  },
  settingsText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});
