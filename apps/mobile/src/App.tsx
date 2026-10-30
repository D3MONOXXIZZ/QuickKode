import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import type {
  ChatMessage,
  ActiveModelConfig,
  ExecutionMode,
  ActivePreview,
  BYOKConfig,
  FileTreeNode,
  FileDiff,
} from '@quickkode/shared';
import type { ClientProject, ChatThread } from './types/client.js';
import { QuickKodeSocketClient } from './services/socketClient.js';
import { ChatScreen } from './screens/ChatScreen.js';
import { SidebarDrawer } from './components/SidebarDrawer.js';
import { GitHubImportModal } from './components/GitHubImportModal.js';
import { SettingsModal } from './components/SettingsModal.js';
import { FileTreeModal } from './components/FileTreeModal.js';
import { CodeEditorModal } from './components/CodeEditorModal.js';
import { DiffViewerModal } from './components/DiffViewerModal.js';
import { LivePreviewModal } from './components/LivePreviewModal.js';

export const App: React.FC = () => {
  const [activeSessionId, setActiveSessionId] = useState('session-primary-001');
  const [activeProjectId, setActiveProjectId] = useState('project-primary');
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('turbo');
  const [isLoading, setIsLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isFileTreeOpen, setIsFileTreeOpen] = useState(false);
  const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isLivePreviewOpen, setIsLivePreviewOpen] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  const [activePreview, setActivePreview] = useState<ActivePreview | null>(null);
  const [pendingDiffs, setPendingDiffs] = useState<FileDiff[]>([]);
  const [fileTree, setFileTree] = useState<FileTreeNode | null>({
    name: 'my-mobile-app',
    path: '.',
    isDirectory: true,
    children: [
      {
        name: 'src',
        path: 'src',
        isDirectory: true,
        children: [
          { name: 'App.tsx', path: 'src/App.tsx', isDirectory: false, changeStatus: 'modified' },
          { name: 'index.ts', path: 'src/index.ts', isDirectory: false },
        ],
      },
      { name: 'package.json', path: 'package.json', isDirectory: false },
      { name: 'README.md', path: 'README.md', isDirectory: false },
    ],
  });
  const [editingFile, setEditingFile] = useState<{ path: string; content: string } | null>(null);

  const [activeModel, setActiveModel] = useState<ActiveModelConfig>({
    provider: 'antigravity',
    modelName: 'antigravity-gemini-2.5',
    authType: 'pc_account',
  });

  const [byokConfig, setByokConfig] = useState<BYOKConfig>({
    antigravityAuthType: 'pc_account',
  });

  const [projects, setProjects] = useState<ClientProject[]>([
    {
      id: 'project-primary',
      name: 'my-mobile-app',
      source: 'google_drive',
      syncStatus: 'in_sync',
      activeBranch: 'main',
    },
  ]);

  const [threads, setThreads] = useState<ChatThread[]>([
    {
      id: 'thread-1',
      sessionId: 'session-primary-001',
      projectId: 'project-primary',
      title: 'Initial Feature Scaffold',
      modelConfig: activeModel,
      mode: 'turbo',
      lastMessageAt: new Date().toISOString(),
      messages: [
        {
          id: 'msg-1',
          sessionId: 'session-primary-001',
          role: 'assistant',
          content: 'Hello! I am connected to your Gemini Antigravity (PC Account). How can I assist with your code today?',
          timestamp: new Date().toISOString(),
        },
      ],
    },
  ]);

  const socketRef = useRef<QuickKodeSocketClient | null>(null);

  useEffect(() => {
    const socket = new QuickKodeSocketClient();
    socketRef.current = socket;

    void socket.connect().then(() => {
      socket.joinSession(activeSessionId);
    }).catch(() => {
      // Offline fallback
    });

    socket.on('agent:thought', (payload: { title: string; content: string }) => {
      setThreads((prev) =>
        prev.map((t) => {
          if (t.sessionId !== activeSessionId) return t;
          const msgs = [...t.messages];
          const last = msgs[msgs.length - 1];
          if (last && last.role === 'assistant') {
            const thoughts = last.thoughts ? [...last.thoughts] : [];
            thoughts.push({
              id: `th-${Date.now()}`,
              title: payload.title,
              content: payload.content,
              timestamp: new Date().toISOString(),
              status: 'completed',
            });
            msgs[msgs.length - 1] = { ...last, thoughts };
          }
          return { ...t, messages: msgs };
        }),
      );
    });

    socket.on('preview:ready', (payload: { preview: ActivePreview }) => {
      setActivePreview(payload.preview);
    });

    socket.on('agent:completed', (payload: { summary: string }) => {
      setIsLoading(false);
      setThreads((prev) =>
        prev.map((t) => {
          if (t.sessionId !== activeSessionId) return t;
          return {
            ...t,
            messages: [
              ...t.messages,
              {
                id: `msg-done-${Date.now()}`,
                sessionId: activeSessionId,
                role: 'assistant',
                content: payload.summary,
                timestamp: new Date().toISOString(),
              },
            ],
          };
        }),
      );
    });

    socket.on('file:tree', (payload: { tree: FileTreeNode }) => {
      if (payload.tree) {
        setFileTree(payload.tree);
      }
    });

    socket.on('file:content', (payload: { path: string; content: string }) => {
      setEditingFile(payload);
      setIsCodeEditorOpen(true);
    });

    socket.on('agent:diff_ready', (payload: { diffs: FileDiff[] }) => {
      setPendingDiffs(payload.diffs ?? []);
      setIsDiffModalOpen(true);
    });

    socket.on('agent:push_completed', () => {
      setIsPushing(false);
      setIsDiffModalOpen(false);
      setPendingDiffs([]);
    });

    return () => {
      socket.disconnect();
    };
  }, [activeSessionId]);

  const activeThread = threads.find((t) => t.sessionId === activeSessionId) ?? threads[0];
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];

  const handleSendPrompt = (prompt: string) => {
    setIsLoading(true);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sessionId: activeSessionId,
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    const initialAssistantMsg: ChatMessage = {
      id: `asst-${Date.now()}`,
      sessionId: activeSessionId,
      role: 'assistant',
      content: 'Analyzing codebase and planning changes...',
      timestamp: new Date().toISOString(),
      thoughts: [],
    };

    setThreads((prev) =>
      prev.map((t) => {
        if (t.sessionId !== activeSessionId) return t;
        return {
          ...t,
          lastMessageAt: new Date().toISOString(),
          messages: [...t.messages, userMsg, initialAssistantMsg],
        };
      }),
    );

    socketRef.current?.sendPrompt({
      sessionId: activeSessionId,
      prompt,
      mode: executionMode,
      modelConfig: activeModel,
    });
  };

  const handleToggleTurbo = () => {
    setExecutionMode((prev) => (prev === 'turbo' ? 'standard' : 'turbo'));
  };

  const handleNewChat = () => {
    const newSessionId = `session-${Date.now()}`;
    const newThread: ChatThread = {
      id: `thread-${Date.now()}`,
      sessionId: newSessionId,
      projectId: activeProjectId,
      title: 'New Conversation',
      modelConfig: activeModel,
      mode: executionMode,
      lastMessageAt: new Date().toISOString(),
      messages: [],
    };

    setThreads((prev) => [newThread, ...prev]);
    setActiveSessionId(newSessionId);
    setIsDrawerOpen(false);
  };

  const handleGitHubImport = (repoFullName: string, branch?: string) => {
    const newProjectId = `proj-${repoFullName.replace('/', '-')}`;
    const newProject: ClientProject = {
      id: newProjectId,
      name: repoFullName,
      source: 'github',
      syncStatus: 'syncing',
      activeBranch: branch ?? 'main',
    };

    setProjects((prev) => [newProject, ...prev]);
    setActiveProjectId(newProjectId);
    socketRef.current?.importGitHubRepo(repoFullName, branch);
  };

  const handleOpenFileTree = () => {
    socketRef.current?.requestFileList(activeSessionId);
    setIsFileTreeOpen(true);
  };

  const handleSelectFile = (path: string) => {
    socketRef.current?.requestFileRead(activeSessionId, path);
    setEditingFile({ path, content: '// Loading file content...' });
    setIsFileTreeOpen(false);
    setIsCodeEditorOpen(true);
  };

  const handleSaveFile = (path: string, content: string) => {
    socketRef.current?.saveFile(activeSessionId, path, content);
    setIsCodeEditorOpen(false);
    setEditingFile(null);
  };

  const handleOpenDiffs = () => {
    setIsDiffModalOpen(true);
  };

  const handleApproveAndPush = () => {
    setIsPushing(true);
    socketRef.current?.approvePush(activeSessionId, 'feat: mobile agent updates');
  };

  const handleOpenPreview = (preview: ActivePreview) => {
    setActivePreview(preview);
    setIsLivePreviewOpen(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#131314" />
      <View style={styles.root}>
        <ChatScreen
          projectName={activeProject?.name ?? 'QuickKode Project'}
          messages={activeThread?.messages ?? []}
          activeModel={activeModel}
          executionMode={executionMode}
          isLoading={isLoading}
          activePreview={activePreview}
          hasDiffs={pendingDiffs.length > 0}
          onSendPrompt={handleSendPrompt}
          onToggleTurboMode={handleToggleTurbo}
          onOpenSidebar={() => setIsDrawerOpen(true)}
          onOpenModelSelector={() => setIsSettingsModalOpen(true)}
          onOpenPreview={handleOpenPreview}
          onOpenFileTree={handleOpenFileTree}
          onOpenDiffs={handleOpenDiffs}
        />

        <SidebarDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          activeModel={activeModel}
          activeProjectId={activeProjectId}
          activeSessionId={activeSessionId}
          threads={threads}
          projects={projects}
          onSelectThread={(threadId) => {
            const thread = threads.find((t) => t.id === threadId);
            if (thread) {
              setActiveSessionId(thread.sessionId);
              setActiveProjectId(thread.projectId);
            }
            setIsDrawerOpen(false);
          }}
          onSelectProject={(projId) => {
            setActiveProjectId(projId);
            setIsDrawerOpen(false);
          }}
          onNewChat={handleNewChat}
          onOpenGitHubImport={() => {
            setIsDrawerOpen(false);
            setIsGitHubModalOpen(true);
          }}
          onOpenSettings={() => {
            setIsDrawerOpen(false);
            setIsSettingsModalOpen(true);
          }}
        />

        <GitHubImportModal
          visible={isGitHubModalOpen}
          onClose={() => setIsGitHubModalOpen(false)}
          onImport={handleGitHubImport}
        />

        <SettingsModal
          visible={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          config={byokConfig}
          onSave={(newConfig) => {
            setByokConfig(newConfig);
            if (newConfig.antigravityAuthType === 'pc_account') {
              setActiveModel({
                provider: 'antigravity',
                modelName: 'antigravity-gemini-2.5',
                authType: 'pc_account',
              });
            } else if (newConfig.deepseekApiKey) {
              setActiveModel({
                provider: 'opencode',
                modelName: 'deepseek-coder-v2',
                apiKey: newConfig.deepseekApiKey,
              });
            }
          }}
        />

        <FileTreeModal
          visible={isFileTreeOpen}
          onClose={() => setIsFileTreeOpen(false)}
          tree={fileTree}
          onSelectFile={handleSelectFile}
          onRefresh={() => socketRef.current?.requestFileList(activeSessionId)}
        />

        <CodeEditorModal
          visible={isCodeEditorOpen}
          onClose={() => {
            setIsCodeEditorOpen(false);
            setEditingFile(null);
          }}
          filePath={editingFile?.path ?? ''}
          initialContent={editingFile?.content ?? ''}
          onSave={handleSaveFile}
        />

        <DiffViewerModal
          visible={isDiffModalOpen}
          onClose={() => setIsDiffModalOpen(false)}
          diffs={pendingDiffs}
          onApproveAndPush={handleApproveAndPush}
          isPushing={isPushing}
        />

        <LivePreviewModal
          visible={isLivePreviewOpen}
          onClose={() => setIsLivePreviewOpen(false)}
          preview={activePreview}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#131314',
  },
  root: {
    flex: 1,
    backgroundColor: '#131314',
  },
});

export default App;
