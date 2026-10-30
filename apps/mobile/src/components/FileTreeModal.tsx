import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput, StyleSheet } from 'react-native';
import type { FileTreeNode } from '@quickkode/shared';
import { theme } from '../theme';

export interface FileTreeModalProps {
  visible: boolean;
  onClose: () => void;
  tree: FileTreeNode | null;
  onSelectFile: (path: string) => void;
  onRefresh?: () => void;
}

export const FileTreeModal: React.FC<FileTreeModalProps> = ({
  visible,
  onClose,
  tree,
  onSelectFile,
  onRefresh,
}) => {
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');

  const toggleDirectory = (dirPath: string) => {
    setCollapsedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) next.delete(dirPath);
      else next.add(dirPath);
      return next;
    });
  };

  const getFileIcon = (fileName: string, isDir: boolean, isCollapsed: boolean) => {
    if (isDir) return isCollapsed ? '📁' : '📂';
    if (fileName.endsWith('.tsx') || fileName.endsWith('.ts')) return '🔷';
    if (fileName.endsWith('.json')) return '🟨';
    if (fileName.endsWith('.md')) return '📝';
    if (fileName.endsWith('.css') || fileName.endsWith('.scss')) return '🎨';
    return '📄';
  };

  const renderNode = (node: FileTreeNode, depth = 0): React.ReactNode => {
    const isDir = node.isDirectory;
    const isCollapsed = collapsedDirs.has(node.path);

    if (searchFilter.trim() && !isDir && !node.name.toLowerCase().includes(searchFilter.toLowerCase())) {
      return null;
    }

    const statusBadge =
      node.changeStatus === 'modified'
        ? 'M'
        : node.changeStatus === 'added'
        ? '+'
        : node.changeStatus === 'deleted'
        ? 'D'
        : null;

    return (
      <View key={node.path || node.name}>
        <TouchableOpacity
          style={[styles.nodeRow, { paddingLeft: 16 + depth * 16 }]}
          onPress={() => {
            if (isDir) toggleDirectory(node.path);
            else {
              onSelectFile(node.path);
              onClose();
            }
          }}
          activeOpacity={0.7}
        >
          {isDir && (
            <Text style={styles.chevronIcon}>{isCollapsed ? '›' : 'ˇ'}</Text>
          )}

          <Text style={styles.nodeIcon}>
            {getFileIcon(node.name, isDir, isCollapsed)}
          </Text>

          <Text style={[styles.nodeName, isDir && styles.dirName]} numberOfLines={1}>
            {node.name}
          </Text>

          {statusBadge && (
            <View
              style={[
                styles.statusBadge,
                statusBadge === 'M' && styles.badgeModified,
                statusBadge === '+' && styles.badgeAdded,
                statusBadge === 'D' && styles.badgeDeleted,
              ]}
            >
              <Text style={styles.statusBadgeText}>{statusBadge}</Text>
            </View>
          )}
        </TouchableOpacity>

        {isDir && !isCollapsed && node.children && (
          <View>{node.children.map((child) => renderNode(child, depth + 1))}</View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Project File Explorer</Text>
              <Text style={styles.subtitle}>Streamed from cloud microVM (0 local storage)</Text>
            </View>
            <View style={styles.headerBtns}>
              {onRefresh && (
                <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.refreshBtnText}>🔄</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Filter Search Input */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Filter files (e.g. App.tsx, button)..."
              placeholderTextColor={theme.colors.textMuted}
              value={searchFilter}
              onChangeText={setSearchFilter}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <ScrollView style={styles.treeScroll} showsVerticalScrollIndicator={false}>
            {tree ? renderNode(tree) : <Text style={styles.loadingText}>Connecting to cloud workspace...</Text>}
          </ScrollView>
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
    height: '82%',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  headerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshBtn: {
    padding: 6,
  },
  refreshBtnText: {
    fontSize: 14,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  searchInput: {
    backgroundColor: theme.colors.bgBase,
    color: theme.colors.textPrimary,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  treeScroll: {
    flex: 1,
    paddingVertical: 8,
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 20,
  },
  chevronIcon: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    width: 12,
    marginRight: 4,
  },
  nodeIcon: {
    fontSize: 13,
    marginRight: 8,
  },
  nodeName: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    flex: 1,
    fontFamily: theme.fonts.code,
  },
  dirName: {
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    marginLeft: 6,
  },
  badgeModified: {
    backgroundColor: theme.colors.accentAmberDim,
  },
  badgeAdded: {
    backgroundColor: theme.colors.accentEmeraldDim,
  },
  badgeDeleted: {
    backgroundColor: theme.colors.accentRoseDim,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  loadingText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 13,
  },
});
