import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet, Linking } from 'react-native';
import type { ActivePreview, ApiEndpoint } from '@quickkode/shared';

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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                {preview.mode === 'web'
                  ? '🌐 Live Web Preview'
                  : preview.mode === 'expo'
                  ? '📱 Live Mobile App Preview'
                  : '⚡ Live API Testing Playground'}
              </Text>
              <Text style={styles.subtitle}>
                {preview.isReady ? '🟢 Dev Server Active' : '🔄 Starting Server...'}
              </Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll}>
            {/* Mode A: Web Application Preview */}
            {preview.mode === 'web' && (
              <View style={styles.webContainer}>
                <View style={styles.addressBar}>
                  <Text style={styles.addressText} numberOfLines={1}>
                    🔒 {preview.tunnelUrl ?? 'http://localhost:3000'}
                  </Text>
                  <TouchableOpacity
                    style={styles.openExternalBtn}
                    onPress={() => handleOpenExternal(preview.tunnelUrl)}
                  >
                    <Text style={styles.openExternalText}>Open Browser ↗</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.mockViewport}>
                  <Text style={styles.viewportIcon}>🌐</Text>
                  <Text style={styles.viewportTitle}>Web App Running on Port {preview.localPort}</Text>
                  <Text style={styles.viewportDesc}>
                    Your live frontend is tunneled via Cloudflare HTTPS. Tap above to interact with your live app in Chrome/Safari or inside the in-app browser.
                  </Text>
                </View>
              </View>
            )}

            {/* Mode B: Expo Mobile App Preview */}
            {preview.mode === 'expo' && (
              <View style={styles.expoContainer}>
                <View style={styles.expoHeroBox}>
                  <Text style={styles.expoIcon}>📱</Text>
                  <Text style={styles.expoTitle}>React Native / Expo Go</Text>
                  <Text style={styles.expoDesc}>
                    Test your mobile application directly on this phone with native performance and instant hot-reloading.
                  </Text>

                  <TouchableOpacity
                    style={styles.expoLaunchBtn}
                    onPress={() => handleOpenExternal(preview.deepLinkUrl)}
                  >
                    <Text style={styles.expoLaunchText}>Launch in Expo Go App ↗</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.detailsBox}>
                  <Text style={styles.detailLabel}>Deep Link URL:</Text>
                  <Text style={styles.detailVal}>{preview.deepLinkUrl ?? 'exp://localhost:8081'}</Text>

                  <Text style={styles.detailLabel}>Metro Bundler Port:</Text>
                  <Text style={styles.detailVal}>{preview.expoPort}</Text>
                </View>
              </View>
            )}

            {/* Mode C: Backend API Preview */}
            {preview.mode === 'api' && (
              <View style={styles.apiContainer}>
                <View style={styles.addressBar}>
                  <Text style={styles.addressText} numberOfLines={1}>
                    Swagger Docs: {preview.swaggerUrl}
                  </Text>
                  <TouchableOpacity
                    style={styles.openExternalBtn}
                    onPress={() => handleOpenExternal(preview.swaggerUrl)}
                  >
                    <Text style={styles.openExternalText}>Docs ↗</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionHeader}>DETECTED ENDPOINTS</Text>
                {preview.endpoints?.map((ep, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.endpointRow, selectedEndpoint?.path === ep.path && styles.endpointSelected]}
                    onPress={() => handleTestApiEndpoint(ep)}
                  >
                    <View style={[styles.methodBadge, ep.method === 'GET' ? styles.methodGet : styles.methodPost]}>
                      <Text style={styles.methodText}>{ep.method}</Text>
                    </View>
                    <Text style={styles.endpointPath} numberOfLines={1}>
                      {ep.path}
                    </Text>
                    <Text style={styles.executeArrow}>▶</Text>
                  </TouchableOpacity>
                ))}

                {/* API Response Viewport */}
                {selectedEndpoint && (
                  <View style={styles.responseBox}>
                    <Text style={styles.responseTitle}>
                      Response: {selectedEndpoint.method} {selectedEndpoint.path}
                    </Text>
                    {isExecuting ? (
                      <Text style={styles.responseLoading}>Executing request...</Text>
                    ) : (
                      <ScrollView horizontal style={styles.responseScroll}>
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
    backgroundColor: 'rgba(0,0,0,0.75)',
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
  subtitle: {
    color: '#8E918F',
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: '#C4C7C5',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bodyScroll: {
    flex: 1,
    padding: 16,
  },
  webContainer: {},
  addressBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#131314',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2B2D30',
    marginBottom: 16,
  },
  addressText: {
    color: '#A8C7FA',
    fontSize: 12,
    fontFamily: 'monospace',
    flex: 1,
  },
  openExternalBtn: {
    backgroundColor: '#282A2C',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },
  openExternalText: {
    color: '#D3E3FD',
    fontSize: 11,
    fontWeight: '600',
  },
  mockViewport: {
    backgroundColor: '#191A1B',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2B2D30',
  },
  viewportIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  viewportTitle: {
    color: '#E3E3E3',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  viewportDesc: {
    color: '#8E918F',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  expoContainer: {},
  expoHeroBox: {
    backgroundColor: '#191A1B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2B2D30',
    marginBottom: 16,
  },
  expoIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  expoTitle: {
    color: '#E3E3E3',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  expoDesc: {
    color: '#8E918F',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  expoLaunchBtn: {
    backgroundColor: '#A8C7FA',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  expoLaunchText: {
    color: '#041E49',
    fontSize: 14,
    fontWeight: '700',
  },
  detailsBox: {
    backgroundColor: '#131314',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#282A2C',
  },
  detailLabel: {
    color: '#8E918F',
    fontSize: 11,
    marginBottom: 2,
    marginTop: 6,
  },
  detailVal: {
    color: '#D3E3FD',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  apiContainer: {},
  sectionHeader: {
    color: '#8E918F',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  endpointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191A1B',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2B2D30',
  },
  endpointSelected: {
    borderColor: '#A8C7FA',
    backgroundColor: '#20242B',
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  methodGet: {
    backgroundColor: '#1E3A2F',
  },
  methodPost: {
    backgroundColor: '#1A3353',
  },
  methodText: {
    color: '#E3E3E3',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  endpointPath: {
    color: '#E3E3E3',
    fontFamily: 'monospace',
    fontSize: 12,
    flex: 1,
  },
  executeArrow: {
    color: '#A8C7FA',
    fontSize: 12,
    marginLeft: 6,
  },
  responseBox: {
    backgroundColor: '#131314',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#282A2C',
  },
  responseTitle: {
    color: '#E3E3E3',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  responseLoading: {
    color: '#8E918F',
    fontSize: 12,
  },
  responseScroll: {
    maxHeight: 180,
  },
  responseText: {
    color: '#34A853',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
});
