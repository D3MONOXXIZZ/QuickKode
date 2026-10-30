import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { theme } from '../theme';

export interface CodeEditorModalProps {
  visible: boolean;
  onClose: () => void;
  filePath: string;
  initialContent: string;
  onSave: (path: string, content: string) => void;
}

const PROGRAMMING_KEYS = ['{', '}', '(', ')', '[', ']', ';', '=', '<', '>', '/', '"', "'", ':', '$', '&', '|', '!'];

export const CodeEditorModal: React.FC<CodeEditorModalProps> = ({
  visible,
  onClose,
  filePath,
  initialContent,
  onSave,
}) => {
  const [content, setContent] = useState(initialContent);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setContent(initialContent);
    setIsDirty(false);
  }, [initialContent, filePath]);

  const handleChangeText = (text: string) => {
    setContent(text);
    setIsDirty(text !== initialContent);
  };

  const handleInsertSymbol = (symbol: string) => {
    setContent((prev) => prev + symbol);
    setIsDirty(true);
  };

  const handleInsertTab = () => {
    setContent((prev) => prev + '  '); // 2-space indentation
    setIsDirty(true);
  };

  const handleSave = () => {
    onSave(filePath, content);
    setIsDirty(false);
  };

  const fileName = filePath.split('/').pop() || 'file';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.titleBox}>
            <View style={styles.titleRow}>
              <Text style={styles.fileName} numberOfLines={1}>
                {fileName}
              </Text>
              {isDirty && <View style={styles.dirtyDot} />}
            </View>
            <Text style={styles.filePath} numberOfLines={1}>
              {filePath}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, isDirty ? styles.saveBtnActive : styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!isDirty}
            activeOpacity={0.8}
          >
            <Text style={[styles.saveBtnText, isDirty && styles.saveBtnTextActive]}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Code Editor Body */}
        <ScrollView style={styles.editorScroll} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.codeText}
            value={content}
            onChangeText={handleChangeText}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />
        </ScrollView>

        {/* Developer Accessory Keyboard Bar */}
        <View style={styles.accessoryBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accessoryContent}>
            <TouchableOpacity style={styles.tabKeyBtn} onPress={handleInsertTab} activeOpacity={0.7}>
              <Text style={styles.tabKeyText}>TAB</Text>
            </TouchableOpacity>

            {PROGRAMMING_KEYS.map((key) => (
              <TouchableOpacity key={key} style={styles.symbolKeyBtn} onPress={() => handleInsertSymbol(key)} activeOpacity={0.7}>
                <Text style={styles.symbolKeyText}>{key}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.bgSurface,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: theme.colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  titleBox: {
    flex: 1,
    marginHorizontal: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fileName: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: theme.fonts.code,
  },
  dirtyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.accentAmber,
  },
  filePath: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.radius.full,
  },
  saveBtnActive: {
    backgroundColor: theme.colors.accentPrimary,
    shadowColor: theme.colors.accentPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnDisabled: {
    backgroundColor: theme.colors.bgCardHover,
  },
  saveBtnText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  saveBtnTextActive: {
    color: '#FFFFFF',
  },
  editorScroll: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
    padding: 16,
  },
  codeText: {
    color: '#F3F4F6',
    fontFamily: theme.fonts.code,
    fontSize: 13,
    lineHeight: 20,
    minHeight: 400,
  },
  accessoryBar: {
    backgroundColor: theme.colors.bgSurface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    paddingVertical: 6,
  },
  accessoryContent: {
    paddingHorizontal: 12,
    gap: 6,
  },
  tabKeyBtn: {
    backgroundColor: theme.colors.bgCardHover,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  tabKeyText: {
    color: theme.colors.accentCyan,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: theme.fonts.code,
  },
  symbolKeyBtn: {
    backgroundColor: theme.colors.bgCardHover,
    width: 36,
    height: 36,
    borderRadius: theme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  symbolKeyText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.code,
  },
});
