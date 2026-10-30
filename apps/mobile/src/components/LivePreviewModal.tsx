import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet, Linking } from 'react-native';
import type { ActivePreview, ApiEndpoint } from '@quickkode/shared';
import { theme } from '../theme';

export interface LivePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  preview: ActivePreview | null;
}

export const LivePreviewModal: React.FC<LivePreviewModalProps> = ({ visible, onClose, preview }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  if (!preview) return null;

  const handleOpenExternal = (url?: string) => {
    if (url) {
      void Linking.openURL(url);
    }
  };

  const handleTestApiEndpoint = async (endpoint: ApiEndpoint) => {
    setSelectedEndpoint(endpoint);
    setIsExecuting(true);
    setApiResponse(null);

    try {
      const baseUrl = preview.tunnelUrl ?? 'http://localhost:3000';
      const fullUrl = `${baseUrl.replace(/\/$/, '')}${endpoint.path}`;

      const res = await fetch(fullUrl, { method: endpoint.method });
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        setApiResponse(JSON.stringify(json, null, 2));
      } catch {
        setApiResponse(text || `HTTP Status: ${res.status}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setApiResponse(`Request Failed: ${msg}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const modeTitle =
    preview.mode === 'web'
      ? 'Live Web Preview'
      : preview.mode === 'expo'
      ? 'Live Mobile App Preview'
      : 'Interactive API Testing Playground';

  const modeIcon =
    preview.mode === 'web'
      ? '🌐'
      : preview.mode === 'expo'
      ? '📱'
      : '⚡';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.titleRow}>
                <Text style={styles.modeIcon}>{modeIcon}</Text>
                <Text style={styles.title}>{modeTitle}</Text>
              </View>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, preview.isReady ? styles.dotReady : styles.dotPending]} />
                <Text style={[styles.subtitle, preview.isReady && styles.subtitleReady]}>
                  {preview.isReady ? 'Cloud Tunnel Active' : 'Starting Dev Server...'}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* Mode A: Web Application Preview */}
            {preview.mode === 'web' && (
              <View style={styles.webContainer}>
                <View style={styles.addressBar}>
                  <Text style={styles.addressText} numberOfLines={1}>
                    🔒 {preview.tunnelUrl ?? `http://localhost:${preview.localPort}`}
                  </Text>
                  <TouchableOpacity
                    style={styles.openExternalBtn}
                    onPress={() => handleOpenExternal(preview.tunnelUrl)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.openExternalText}>Open Browser ↗</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.viewportCard}>
                  <View style={styles.viewportIconBadge}>
                    <Text style={styles.viewportIconText}>🌐</Text>
                  </View>
                  <Text style={styles.viewportTitle}>Web Server on Port {preview.localPort}</Text>
                  <Text style={styles.viewportDesc}>
                    Your application is live in an isolated microVM with hot-reload enabled. You can open it in any browser or test it directly.
                  </Text>
                </View>
              </View>
            )}

            {/* Mode B: Expo Mobile App Preview */}
            {preview.mode === 'expo' && (
              <View style={styles.expoContainer}>
                <View style={styles.viewportCard}>
                  <View style={styles.viewportIconBadge}>
                    <Text style={styles.viewportIconText}>📱</Text>
                  </View>
                  <Text style={styles.viewportTitle}>Expo Go Native Runner</Text>
                  <Text style={styles.viewportDesc}>
                    Test your mobile app in real-time with native device hardware, gestures, and fast refresh.
                  </Text>

                  <TouchableOpacity
                    style={styles.expoLaunchBtn}
                    onPress={() => handleOpenExternal(preview.deepLinkUrl)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.expoLaunchText}>Launch in Expo Go ↗</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.detailsBox}>
                  <Text style={styles.detailLabel}>DEEP LINK URL</Text>
                  <Text style={styles.detailVal}>{preview.deepLinkUrl ?? 'exp://localhost:8081'}</Text>

                  <Text style={styles.detailLabel}>METRO BUNDLER PORT</Text>
                  <Text style={styles.detailVal}>{preview.expoPort}</Text>
                </View>
              </View>
            )}

            {/* Mode C: Backend API Preview */}
            {preview.mode === 'api' && (
              <View style={styles.apiContainer}>
                {preview.swaggerUrl && (
                  <View style={styles.addressBar}>
                    <Text style={styles.addressText} numberOfLines={1}>
                      Swagger: {preview.swaggerUrl}
                    </Text>
                    <TouchableOpacity
                      style={styles.openExternalBtn}
                      onPress={() => handleOpenExternal(preview.swaggerUrl)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.openExternalText}>Docs ↗</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.sectionHeader}>SCANNED API ENDPOINTS</Text>
                {preview.endpoints?.map((ep, idx) => {
                  const isGet = ep.method === 'GET';
                  const isPost = ep.method === 'POST';
                  const isDelete = ep.method === 'DELETE';
                  const isSelected = selectedEndpoint?.path === ep.path;

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.endpointRow, isSelected && styles.endpointSelected]}
                      onPress={() => handleTestApiEndpoint(ep)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.methodBadge,
                          isGet && styles.methodGet,
                          isPost && styles.methodPost,
                          isDelete && styles.methodDelete,
                        ]}
                      >
                        <Text style={styles.methodText}>{ep.method}</Text>
                      </View>
                      <Text style={styles.endpointPath} numberOfLines={1}>
                        {ep.path}
                      </Text>
                      <Text style={styles.executeArrow}>▶</Text>
                    </TouchableOpacity>
                  );
                })}

                {/* API Response Viewport */}
                {selectedEndpoint && (
                  <View style={styles.responseBox}>
                    <Text style={styles.responseTitle}>
                      Response: {selectedEndpoint.method} {selectedEndpoint.path}
                    </Text>
                    {isExecuting ? (
                      <Text style={styles.responseLoading}>Executing HTTP request...</Text>
                    ) : (
                      <ScrollView horizontal style={styles.responseScroll} showsHorizontalScrollIndicator={false}>
                        <Text style={styles.responseText}>{apiResponse}</Text>
                      </ScrollView>
                    )}
                  </View>
                )}
              </View>
            )}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeIcon: {
    fontSize: 18,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotReady: {
    backgroundColor: theme.colors.accentEmerald,
  },
  dotPending: {
    backgroundColor: theme.colors.accentAmber,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  subtitleReady: {
    color: theme.colors.accentEmerald,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  bodyScroll: {
    flex: 1,
    padding: 16,
  },
  webContainer: {
    flex: 1,
  },
  addressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.bgBase,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  addressText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    flex: 1,
    fontFamily: theme.fonts.code,
  },
  openExternalBtn: {
    backgroundColor: theme.colors.accentPrimaryDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  openExternalText: {
    color: theme.colors.accentPrimaryLight,
    fontSize: 11,
    fontWeight: '700',
  },
  viewportCard: {
    backgroundColor: theme.colors.bgCard,
    borderRadius: theme.radius.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  viewportIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.bgSurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewportIconText: {
    fontSize: 26,
  },
  viewportTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  viewportDesc: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  expoContainer: {
    flex: 1,
  },
  expoLaunchBtn: {
    backgroundColor: theme.colors.accentPrimary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.radius.full,
    marginTop: 16,
    shadowColor: theme.colors.accentPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  expoLaunchText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  detailsBox: {
    backgroundColor: theme.colors.bgCard,
    padding: 14,
    borderRadius: theme.radius.md,
    marginTop: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  detailLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: 2,
  },
  detailVal: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontFamily: theme.fonts.code,
    marginBottom: 6,
  },
  apiContainer: {
    flex: 1,
  },
  sectionHeader: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 2,
  },
  endpointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  endpointSelected: {
    borderColor: theme.colors.accentPrimary,
    backgroundColor: '#1E1A33',
  },
  methodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    marginRight: 8,
  },
  methodGet: {
    backgroundColor: theme.colors.accentEmeraldDim,
  },
  methodPost: {
    backgroundColor: theme.colors.accentBlueDim,
  },
  methodDelete: {
    backgroundColor: theme.colors.accentRoseDim,
  },
  methodText: {
    color: theme.colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
    fontFamily: theme.fonts.code,
  },
  endpointPath: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontFamily: theme.fonts.code,
    flex: 1,
  },
  executeArrow: {
    color: theme.colors.accentPrimaryLight,
    fontSize: 12,
  },
  responseBox: {
    backgroundColor: theme.colors.bgBase,
    borderRadius: theme.radius.md,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  responseTitle: {
    color: theme.colors.accentCyan,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: theme.fonts.code,
    marginBottom: 6,
  },
  responseLoading: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  responseScroll: {
    maxHeight: 200,
  },
  responseText: {
    color: '#E0E7FF',
    fontFamily: theme.fonts.code,
    fontSize: 11,
    lineHeight: 16,
  },
});
