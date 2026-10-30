import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native';
import type { FileDiff } from '@quickkode/shared';
import { theme } from '../theme';

export interface DiffViewerModalProps {
  visible: boolean;
  onClose: () => void;
  diffs: FileDiff[];
  onApproveAndPush: () => void;
  isPushing?: boolean;
}

export const DiffViewerModal: React.FC<DiffViewerModalProps> = ({
  visible,
  onClose,
  diffs,
  onApproveAndPush,
  isPushing = false,
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const toggleFile = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const totalAdditions = diffs.reduce((sum, d) => sum + d.additions, 0);
  const totalDeletions = diffs.reduce((sum, d) => sum + d.deletions, 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Review Agent Changes</Text>
              <View style={styles.statsRow}>
                <Text style={styles.filesCount}>{diffs.length} files changed</Text>
                <View style={styles.badgeAdd}>
                  <Text style={styles.addText}>+{totalAdditions}</Text>
                </View>
                <View style={styles.badgeDel}>
                  <Text style={styles.delText}>-{totalDeletions}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.diffScroll} showsVerticalScrollIndicator={false}>
            {diffs.map((diff, index) => {
              const isExpanded = expandedIndex === index;

              return (
                <View key={diff.path || index} style={styles.fileCard}>
                  <TouchableOpacity
                    style={styles.fileHeader}
                    onPress={() => toggleFile(index)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.fileIcon}>{isExpanded ? '▾' : '▸'}</Text>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {diff.path}
                    </Text>

                    <View style={styles.fileStats}>
                      <Text style={styles.addStatText}>+{diff.additions}</Text>
                      <Text style={styles.statSeparator}>/</Text>
                      <Text style={styles.delStatText}>-{diff.deletions}</Text>
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <ScrollView horizontal style={styles.diffHunkBox} showsHorizontalScrollIndicator={false}>
                      <View style={styles.diffLinesCol}>
                        <Text style={styles.rawDiff}>{diff.diffHunks}</Text>
                      </View>
                    </ScrollView>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Action Gate Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.approveBtn, isPushing && styles.btnDisabled]}
              onPress={onApproveAndPush}
              disabled={isPushing}
              activeOpacity={0.8}
            >
              <Text style={styles.approveBtnText}>
                {isPushing ? 'Syncing to Cloud Workspace...' : '✓ Approve & Push Changes'}
              </Text>
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
    height: '86%',
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  filesCount: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  badgeAdd: {
    backgroundColor: theme.colors.accentEmeraldDim,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.radius.sm,
  },
  addText: {
    color: theme.colors.accentEmerald,
    fontSize: 11,
    fontWeight: '700',
  },
  badgeDel: {
    backgroundColor: theme.colors.accentRoseDim,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.radius.sm,
  },
  delText: {
    color: theme.colors.accentRose,
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  diffScroll: {
    flex: 1,
    padding: 16,
  },
  fileCard: {
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.radius.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    overflow: 'hidden',
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  fileIcon: {
    color: theme.colors.accentPrimaryLight,
    fontSize: 13,
    marginRight: 8,
  },
  fileName: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.code,
    flex: 1,
  },
  fileStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addStatText: {
    color: theme.colors.accentEmerald,
    fontSize: 11,
    fontWeight: '700',
  },
  statSeparator: {
    color: theme.colors.textMuted,
    marginHorizontal: 3,
    fontSize: 11,
  },
  delStatText: {
    color: theme.colors.accentRose,
    fontSize: 11,
    fontWeight: '700',
  },
  diffHunkBox: {
    backgroundColor: theme.colors.bgBase,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    padding: 10,
  },
  diffLinesCol: {
    minWidth: '100%',
  },
  rawDiff: {
    color: '#E0E7FF',
    fontFamily: theme.fonts.code,
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.bgSurface,
  },
  approveBtn: {
    backgroundColor: theme.colors.accentEmerald,
    borderRadius: theme.radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: theme.colors.accentEmerald,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  approveBtnText: {
    color: '#0A0B0E',
    fontSize: 14,
    fontWeight: '700',
  },
});
