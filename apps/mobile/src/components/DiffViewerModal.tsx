import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native';
import type { FileDiff } from '@quickkode/shared';

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
              <Text style={styles.summaryStats}>
                {diffs.length} files changed •{' '}
                <Text style={styles.addText}>+{totalAdditions}</Text> /{' '}
                <Text style={styles.delText}>-{totalDeletions}</Text>
              </Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.diffScroll}>
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
                      <Text style={styles.addText}>+{diff.additions}</Text>
                      <Text style={styles.statSeparator}>/</Text>
                      <Text style={styles.delText}>-{diff.deletions}</Text>
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <ScrollView horizontal style={styles.diffHunkBox} showsHorizontalScrollIndicator={false}>
                      <View style={styles.diffLinesCol}>
                        {diff.lines ? (
                          diff.lines.map((l, lIdx) => (
                            <Text
                              key={lIdx}
                              style={[
                                styles.diffLine,
                                l.type === 'add' && styles.addLine,
                                l.type === 'delete' && styles.delLine,
                              ]}
                            >
                              {l.type === 'add' ? '+' : l.type === 'delete' ? '-' : ' '} {l.content}
                            </Text>
                          ))
                        ) : (
                          <Text style={styles.rawDiff}>{diff.diffHunks}</Text>
                        )}
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
                {isPushing ? 'Pushing to GitHub...' : '✓ Approve & Push to GitHub'}
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
    backgroundColor: '#1E1F20',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    borderWidth: 1,
    borderColor: '#333538',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#282A2C',
  },
  title: {
    color: '#E3E3E3',
    fontSize: 16,
    fontWeight: '700',
  },
  summaryStats: {
    color: '#8E918F',
    fontSize: 12,
    marginTop: 3,
  },
  addText: {
    color: '#34A853',
    fontWeight: '700',
  },
  delText: {
    color: '#EA4335',
    fontWeight: '700',
  },
  statSeparator: {
    color: '#5F6368',
    marginHorizontal: 3,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: '#C4C7C5',
    fontSize: 16,
    fontWeight: 'bold',
  },
  diffScroll: {
    flex: 1,
    padding: 16,
  },
  fileCard: {
    backgroundColor: '#191A1B',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2B2D30',
    overflow: 'hidden',
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fileIcon: {
    color: '#A8C7FA',
    fontSize: 14,
    marginRight: 8,
  },
  fileName: {
    color: '#E3E3E3',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'monospace',
    flex: 1,
  },
  fileStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  diffHunkBox: {
    backgroundColor: '#131314',
    borderTopWidth: 1,
    borderTopColor: '#282A2C',
    padding: 10,
  },
  diffLinesCol: {
    minWidth: '100%',
  },
  diffLine: {
    color: '#C4C7C5',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 18,
  },
  addLine: {
    color: '#34A853',
    backgroundColor: 'rgba(52, 168, 83, 0.12)',
  },
  delLine: {
    color: '#EA4335',
    backgroundColor: 'rgba(234, 67, 53, 0.12)',
  },
  rawDiff: {
    color: '#C4C7C5',
    fontFamily: 'monospace',
    fontSize: 11,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#282A2C',
    backgroundColor: '#191A1B',
  },
  approveBtn: {
    backgroundColor: '#34A853',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
