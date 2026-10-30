import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, StyleSheet, SafeAreaView } from 'react-native';

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
          <TouchableOpacity style={styles.backBtn} onPress={onClose}>
            <Text style={styles.backBtnText}>✕ Close</Text>
          </TouchableOpacity>

          <View style={styles.titleBox}>
            <Text style={styles.fileName} numberOfLines={1}>
              {fileName} {isDirty && '●'}
            </Text>
            <Text style={styles.filePath} numberOfLines={1}>
              {filePath}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, isDirty ? styles.saveBtnActive : styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!isDirty}
          >
            <Text style={[styles.saveBtnText, isDirty && styles.saveBtnTextActive]}>Save & Sync</Text>
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
            <TouchableOpacity style={styles.tabKeyBtn} onPress={handleInsertTab}>
              <Text style={styles.tabKeyText}>TAB</Text>
            </TouchableOpacity>

            {PROGRAMMING_KEYS.map((key) => (
              <TouchableOpacity key={key} style={styles.symbolKeyBtn} onPress={() => handleInsertSymbol(key)}>
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
    backgroundColor: '#1E1F20',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2B2D30',
    backgroundColor: '#191A1B',
  },
  backBtn: {
    paddingVertical: 6,
    paddingRight: 12,
  },
  backBtnText: {
    color: '#8E918F',
    fontSize: 14,
    fontWeight: '600',
  },
  titleBox: {
    flex: 1,
    alignItems: 'center',
  },
  fileName: {
    color: '#E3E3E3',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  filePath: {
    color: '#8E918F',
    fontSize: 10,
    marginTop: 2,
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#282A2C',
  },
  saveBtnActive: {
    backgroundColor: '#34A853',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: '#8E918F',
    fontSize: 12,
    fontWeight: '700',
  },
  saveBtnTextActive: {
    color: '#FFFFFF',
  },
  editorScroll: {
    flex: 1,
    backgroundColor: '#131314',
    padding: 12,
  },
  codeText: {
    color: '#D3E3FD',
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
    minHeight: 400,
  },
  accessoryBar: {
    backgroundColor: '#1E1F20',
    borderTopWidth: 1,
    borderTopColor: '#2B2D30',
    paddingVertical: 6,
  },
  accessoryContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  tabKeyBtn: {
    backgroundColor: '#2B2D30',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 6,
  },
  tabKeyText: {
    color: '#A8C7FA',
    fontSize: 12,
    fontWeight: '700',
  },
  symbolKeyBtn: {
    backgroundColor: '#282A2C',
    borderRadius: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  symbolKeyText: {
    color: '#E3E3E3',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
});
