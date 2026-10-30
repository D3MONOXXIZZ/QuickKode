import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { AgentThought } from '@quickkode/shared';
import { theme } from '../theme';

export interface ThoughtWidgetProps {
  thoughts: AgentThought[];
  isStreaming?: boolean;
}

export const ThoughtWidget: React.FC<ThoughtWidgetProps> = ({ thoughts, isStreaming }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!thoughts || thoughts.length === 0) return null;

  const latestThought = thoughts[thoughts.length - 1];
  const stepCount = thoughts.length;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.sparkIcon}>✦</Text>
          <Text style={styles.headerTitle}>
            Reasoning Chain ({stepCount} {stepCount === 1 ? 'step' : 'steps'})
          </Text>
          {isStreaming && (
            <View style={styles.streamingBadge}>
              <View style={styles.livePulse} />
              <Text style={styles.streamingText}>Thinking...</Text>
            </View>
          )}
        </View>

        <Text style={styles.disclosureIcon}>{isExpanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* Collapsed single-line preview of latest step */}
      {!isExpanded && latestThought && (
        <View style={styles.previewBox}>
          <Text style={styles.previewBullet}>›</Text>
          <Text style={styles.previewText} numberOfLines={1}>
            <Text style={styles.previewTitle}>{latestThought.title}: </Text>
            {latestThought.content}
          </Text>
        </View>
      )}

      {/* Expanded detailed thought steps */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {thoughts.map((thought, index) => {
            const isCompleted = thought.status === 'completed';
            const isFailed = thought.status === 'failed';

            return (
              <View key={thought.id || index} style={styles.thoughtItem}>
                <View style={styles.timelineCol}>
                  <View
                    style={[
                      styles.bulletCircle,
                      isCompleted && styles.completedCircle,
                      isFailed && styles.failedCircle,
                    ]}
                  >
                    <Text style={styles.bulletText}>{isCompleted ? '✓' : isFailed ? '✕' : '●'}</Text>
                  </View>
                  {index < thoughts.length - 1 && <View style={styles.connectorLine} />}
                </View>

                <View style={styles.bodyCol}>
                  <Text style={styles.thoughtTitle}>{thought.title}</Text>
                  <Text style={styles.thoughtDescription}>{thought.content}</Text>

                  {thought.toolCalls && thought.toolCalls.length > 0 && (
                    <View style={styles.toolCallsBox}>
                      {thought.toolCalls.map((tc, tcIdx) => (
                        <View key={tc.id || tcIdx} style={styles.toolCallChip}>
                          <Text style={styles.toolBadge}>⚡ {tc.name}</Text>
                          <Text style={styles.toolParamText} numberOfLines={1}>
                            {typeof tc.parameters === 'object'
                              ? JSON.stringify(tc.parameters)
                              : String(tc.parameters)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.bgSurface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sparkIcon: {
    color: theme.colors.accentPrimaryLight,
    fontSize: 14,
    marginRight: 6,
  },
  headerTitle: {
    color: theme.colors.accentPrimaryLight,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  streamingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentEmeraldDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accentEmerald,
    marginRight: 5,
  },
  streamingText: {
    color: theme.colors.accentEmerald,
    fontSize: 10,
    fontWeight: '700',
  },
  disclosureIcon: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    paddingLeft: 8,
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 4,
  },
  previewBullet: {
    color: theme.colors.accentPrimaryLight,
    fontSize: 14,
    marginRight: 6,
    fontWeight: 'bold',
  },
  previewText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  previewTitle: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  thoughtItem: {
    flexDirection: 'row',
  },
  timelineCol: {
    alignItems: 'center',
    width: 22,
    marginRight: 8,
  },
  bulletCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.bgCardHover,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.accentAmber,
  },
  completedCircle: {
    borderColor: theme.colors.accentEmerald,
    backgroundColor: theme.colors.accentEmeraldDim,
  },
  failedCircle: {
    borderColor: theme.colors.accentRose,
    backgroundColor: theme.colors.accentRoseDim,
  },
  bulletText: {
    color: theme.colors.textPrimary,
    fontSize: 9,
    fontWeight: '700',
  },
  connectorLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: theme.colors.borderSubtle,
    marginVertical: 4,
  },
  bodyCol: {
    flex: 1,
    paddingBottom: 12,
  },
  thoughtTitle: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  thoughtDescription: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  toolCallsBox: {
    marginTop: 6,
    gap: 4,
  },
  toolCallChip: {
    backgroundColor: theme.colors.bgBase,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  toolBadge: {
    color: theme.colors.accentCyan,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: theme.fonts.code,
    marginBottom: 2,
  },
  toolParamText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontFamily: theme.fonts.code,
  },
});
