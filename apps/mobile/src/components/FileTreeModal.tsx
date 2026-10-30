import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native';
import type { FileTreeNode } from '@quickkode/shared';

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

  const toggleDirectory = (dirPath: string) => {
    setCollapsedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) next.delete(dirPath);
      else next.add(dirPath);
      return next;
    });
  };

  const renderNode = (node: FileTreeNode, depth = 0) => {
    const isDir = node.isDirectory;
    const isCollapsed = collapsedDirs.has(node.path);

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
          style={[styles.nodeRow, { paddingLeft: 16 + depth * 18 }]}
          onPress={() => {
            if (isDir) toggleDirectory(node.path);
            else onSelectFile(node.path);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.nodeIcon}>
            {isDir ? (isCollapsed ? '📁' : '📂') : '📄'}
          </Text>
          <Text style={[styles.nodeName, isDir && styles.dirName]} numberOfLines={1}>
            {node.name}
          </Text>

          {statusBadge && (
            <View style={[styles.statusBadge, statusBadge === 'M' ? styles.badgeM : styles.badgePlus]}>
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
              <Text style={styles.title}>Virtual File Explorer</Text>
              <Text style={styles.subtitle}>Streamed from cloud sandbox (0 local device storage)</Text>
            </View>
            <View style={styles.headerBtns}>
              {onRefresh && (
                <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
                  <Text style={styles.refreshBtnText}>🔄</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.treeScroll}>
            {tree ? renderNode(tree) : <Text style={styles.loadingText}>Loading file hierarchy...</Text>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1E1F20',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    paddingTop: 20,
    borderWidth: 1,
    borderColor: '#333538',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#282A2C',
  },
  title: {
    color: '#E3E3E3',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: '#8E918F',
    fontSize: 11,
    marginTop: 2,
  },
  headerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshBtn: {
    padding: 6,
    marginRight: 8,
  },
  refreshBtnText: {
    fontSize: 14,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: '#C4C7C5',
    fontSize: 16,
    fontWeight: 'bold',
  },
  treeScroll: {
    flex: 1,
    paddingVertical: 10,
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingRight: 20,
  },
  nodeIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  nodeName: {
    color: '#E3E3E3',
    fontSize: 13,
    flex: 1,
    fontFamily: 'monospace',
  },
  dirName: {
    fontWeight: '600',
    color: '#D3E3FD',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  badgeM: {
    backgroundColor: '#5C3800',
  },
  badgePlus: {
    backgroundColor: '#0F5132',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  loadingText: {
    color: '#8E918F',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 13,
  },
});
