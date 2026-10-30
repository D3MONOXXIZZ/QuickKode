import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { AgentThought } from '@quickkode/shared';

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
        <Text style={styles.disclosureIcon}>{isExpanded ? '▾' : '▸'}</Text>
        <Text style={styles.headerTitle}>
          Agent Thinking ({stepCount} {stepCount === 1 ? 'step' : 'steps'})
        </Text>
        {isStreaming && <View style={styles.liveDot} />}
      </TouchableOpacity>

      {/* Collapsed single-line preview of latest step */}
      {!isExpanded && latestThought && (
        <Text style={styles.previewText} numberOfLines={1}>
          {latestThought.title}: {latestThought.content}
        </Text>
      )}

      {/* Expanded detailed thought steps */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {thoughts.map((thought, index) => {
            const isCompleted = thought.status === 'completed';
            const isFailed = thought.status === 'failed';

            return (
              <View key={thought.id || index} style={styles.thoughtItem}>
                <View style={styles.statusCol}>
                  <Text style={[styles.statusBullet, isCompleted && styles.completedBullet, isFailed && styles.failedBullet]}>
                    {isCompleted ? '✓' : isFailed ? '✕' : '●'}
                  </Text>
                  {index < thoughts.length - 1 && <View style={styles.connectorLine} />}
                </View>

                <View style={styles.bodyCol}>
                  <Text style={styles.thoughtTitle}>{thought.title}</Text>
                  <Text style={styles.thoughtDescription}>{thought.content}</Text>

                  {thought.toolCalls && thought.toolCalls.length > 0 && (
                    <View style={styles.toolCallsBox}>
                      {thought.toolCalls.map((tc, tcIdx) => (
                        <Text key={tc.id || tcIdx} style={styles.toolCallLine}>
                          ⚡ {tc.name} {JSON.stringify(tc.parameters)}
                        </Text>
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
    backgroundColor: '#1E1F20',
    borderRadius: 16,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#333538',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disclosureIcon: {
    color: '#A8C7FA',
    fontSize: 16,
    marginRight: 6,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#A8C7FA',
    fontSize: 13,
    fontWeight: '600',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34A853',
    marginLeft: 8,
  },
  previewText: {
    color: '#8E918F',
    fontSize: 12,
    marginTop: 4,
    paddingLeft: 18,
  },
  expandedContent: {
    marginTop: 12,
    paddingLeft: 4,
  },
  thoughtItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statusCol: {
    alignItems: 'center',
    width: 20,
    marginRight: 8,
  },
  statusBullet: {
    color: '#F9AB00',
    fontSize: 12,
  },
  completedBullet: {
    color: '#34A853',
  },
  failedBullet: {
    color: '#EA4335',
  },
  connectorLine: {
    width: 1,
    flex: 1,
    backgroundColor: '#3C4043',
    marginTop: 2,
  },
  bodyCol: {
    flex: 1,
    paddingBottom: 6,
  },
  thoughtTitle: {
    color: '#E3E3E3',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  thoughtDescription: {
    color: '#C4C7C5',
    fontSize: 12,
    lineHeight: 16,
  },
  toolCallsBox: {
    backgroundColor: '#131314',
    padding: 6,
    borderRadius: 6,
    marginTop: 4,
  },
  toolCallLine: {
    color: '#7Cacf8',
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
