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
import type { ClientProject, ChatThread, UserProfile } from './types/client';
import { QuickKodeSocketClient } from './services/socketClient';
import { ChatScreen } from './screens/ChatScreen';
import { SidebarDrawer } from './components/SidebarDrawer';
import { GitHubImportModal } from './components/GitHubImportModal';
import { SettingsModal } from './components/SettingsModal';
import { FileTreeModal } from './components/FileTreeModal';
import { CodeEditorModal } from './components/CodeEditorModal';
import { DiffViewerModal } from './components/DiffViewerModal';
import { LivePreviewModal } from './components/LivePreviewModal';
import { SettingsStorage, DEFAULT_BYOK_CONFIG } from './services/storage';
import { OAuthService } from './services/oauthService';
import { theme } from './theme';

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
  const [isConnected, setIsConnected] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [activePreview, setActivePreview] = useState<ActivePreview | null>(null);
  const [pendingDiffs, setPendingDiffs] = useState<FileDiff[]>([]);
  const [fileTree, setFileTree] = useState<FileTreeNode | null>(null);
  const [editingFile, setEditingFile] = useState<{ path: string; content: string } | null>(null);

  const [activeModel, setActiveModel] = useState<ActiveModelConfig>({
    provider: 'antigravity',
    modelName: 'antigravity-gemini-2.5',
    authType: 'api_key',
  });

  const [byokConfig, setByokConfig] = useState<BYOKConfig>(DEFAULT_BYOK_CONFIG);

  useEffect(() => {
    void SettingsStorage.loadConfig().then((saved) => {
      setByokConfig(saved);
      if (saved.googleOAuthToken) {
        setActiveModel({
          provider: 'antigravity',
          modelName: 'antigravity-gemini-2.5',
          authType: 'oauth',
          oauthToken: saved.googleOAuthToken,
        });
      } else if (saved.geminiApiKey) {
        setActiveModel({
          provider: 'antigravity',
          modelName: 'antigravity-gemini-2.5',
          authType: 'api_key',
          geminiApiKey: saved.geminiApiKey,
        });
      } else if (saved.deepseekApiKey) {
        setActiveModel({
          provider: 'opencode',
          modelName: 'deepseek-coder-v2',
          apiKey: saved.deepseekApiKey,
        });
      } else if (saved.anthropicApiKey) {
        setActiveModel({
          provider: 'opencode',
          modelName: 'claude-3-5-sonnet',
          apiKey: saved.anthropicApiKey,
        });
      } else if (saved.openAiApiKey) {
        setActiveModel({
          provider: 'opencode',
          modelName: 'gpt-4o',
          apiKey: saved.openAiApiKey,
        });
      }
    });

    void SettingsStorage.loadUser().then((user) => {
      if (user) {
        setUserProfile(user);
      }
    });
  }, []);

  const [projects, setProjects] = useState<ClientProject[]>([]);

  const [threads, setThreads] = useState<ChatThread[]>([
    {
      id: 'thread-1',
      sessionId: 'session-primary-001',
      projectId: 'scratchpad',
      title: 'New Coding Session',
      modelConfig: activeModel,
      mode: 'turbo',
      lastMessageAt: new Date().toISOString(),
      messages: [],
    },
  ]);

  const socketRef = useRef<QuickKodeSocketClient | null>(null);

  const initSocketConnection = (targetUrl?: string) => {
    const url = targetUrl ?? byokConfig.orchestratorServerUrl ?? 'ws://192.168.1.80:4000';
    const socket = new QuickKodeSocketClient(url);
    socketRef.current = socket;

    socket.on('connection:open', () => {
      setIsConnected(true);
      socket.joinSession(activeSessionId);
    });

    socket.on('connection:close', () => {
      setIsConnected(false);
    });

    socket.on('connection:error', () => {
      setIsConnected(false);
    });

    void socket
      .connect()
      .then(() => {
        setIsConnected(true);
        socket.joinSession(activeSessionId);
      })
      .catch((err) => {
        console.warn('[QuickKode] Socket connection failed:', err);
        setIsConnected(false);
      });

    socket.on('session:error', (payload: { error: string }) => {
      setIsLoading(false);
      setThreads((prev) =>
        prev.map((t) => {
          if (t.sessionId !== activeSessionId) return t;
          return {
            ...t,
            messages: [
              ...t.messages,
              {
                id: `msg-err-${Date.now()}`,
                sessionId: activeSessionId,
                role: 'assistant',
                content: `⚠️ Error from Cloud Server: ${payload.error}`,
                timestamp: new Date().toISOString(),
              },
            ],
          };
        }),
      );
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
  };

  useEffect(() => {
    return initSocketConnection();
  }, [activeSessionId]);

  const handleReconnect = () => {
    socketRef.current?.disconnect();
    initSocketConnection();
  };

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

    if (!socketRef.current?.connected) {
      setTimeout(() => {
        setIsLoading(false);
        setThreads((prev) =>
          prev.map((t) => {
            if (t.sessionId !== activeSessionId) return t;
            return {
              ...t,
              messages: [
                ...t.messages,
                {
                  id: `asst-offline-${Date.now()}`,
                  sessionId: activeSessionId,
                  role: 'assistant',
                  content:
                    '⚠️ Unable to reach cloud orchestrator at ws://192.168.1.80:4000. Please ensure your mobile phone and computer are on the same Wi-Fi network, then tap the header status to retry.',
                  timestamp: new Date().toISOString(),
                },
              ],
            };
          }),
        );
      }, 800);
      return;
    }

    socketRef.current?.sendPrompt({
      sessionId: activeSessionId,
      prompt,
      mode: executionMode,
      modelConfig: activeModel,
      byok: byokConfig,
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

  const handleSignInGitHub = async () => {
    try {
      const profile = await OAuthService.signInWithGitHub(byokConfig.orchestratorServerUrl);
      setUserProfile(profile);
      if (profile.token) {
        const updated = { ...byokConfig, githubToken: profile.token };
        setByokConfig(updated);
        void SettingsStorage.saveConfig(updated);
      }
    } catch (err) {
      console.warn('[App] GitHub sign-in failed:', err);
    }
  };

  const handleSignInGoogle = async () => {
    try {
      const profile = await OAuthService.signInWithGoogle(
        byokConfig.orchestratorServerUrl,
        byokConfig.googleClientId,
      );
      if (profile) {
        setUserProfile(profile);
        if (profile.token) {
          const updated: BYOKConfig = {
            ...byokConfig,
            googleOAuthToken: profile.token,
            antigravityAuthType: 'oauth',
          };
          setByokConfig(updated);
          void SettingsStorage.saveConfig(updated);
          setActiveModel({
            provider: 'antigravity',
            modelName: 'antigravity-gemini-2.5',
            authType: 'oauth',
            oauthToken: profile.token,
          });
        }
      }
    } catch (err) {
      console.warn('[App] Google sign-in failed:', err);
    }
  };

  const handleSignOut = async () => {
    await OAuthService.signOut();
    setUserProfile(null);
    const updated: BYOKConfig = {
      ...byokConfig,
      googleOAuthToken: undefined,
      antigravityAuthType: byokConfig.geminiApiKey ? 'api_key' : 'pc_account',
    };
    setByokConfig(updated);
    void SettingsStorage.saveConfig(updated);
    if (byokConfig.geminiApiKey) {
      setActiveModel({
        provider: 'antigravity',
        modelName: 'antigravity-gemini-2.5',
        authType: 'api_key',
        geminiApiKey: byokConfig.geminiApiKey,
      });
    } else {
      setActiveModel({
        provider: 'antigravity',
        modelName: 'antigravity-gemini-2.5',
        authType: 'api_key',
        geminiApiKey: undefined,
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.root}>
        <ChatScreen
          projectName={activeProject?.name ?? 'QuickKode Project'}
          messages={activeThread?.messages ?? []}
          activeModel={activeModel}
          executionMode={executionMode}
          isLoading={isLoading}
          isConnected={isConnected}
          activePreview={activePreview}
          hasDiffs={pendingDiffs.length > 0}
          onSendPrompt={handleSendPrompt}
          onToggleTurboMode={handleToggleTurbo}
          onOpenSidebar={() => setIsDrawerOpen(true)}
          onOpenModelSelector={() => setIsSettingsModalOpen(true)}
          onOpenPreview={handleOpenPreview}
          onOpenFileTree={handleOpenFileTree}
          onOpenDiffs={handleOpenDiffs}
          onReconnect={handleReconnect}
        />

        <SidebarDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          activeModel={activeModel}
          activeProjectId={activeProjectId}
          activeSessionId={activeSessionId}
          threads={threads}
          projects={projects}
          userProfile={userProfile}
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
          onSignInGitHub={handleSignInGitHub}
          onSignInGoogle={handleSignInGoogle}
          onSignOut={handleSignOut}
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
          userProfile={userProfile}
          onSignInGoogle={handleSignInGoogle}
          onSignOut={handleSignOut}
          onSave={(newConfig) => {
            const previousUrl = byokConfig.orchestratorServerUrl;
            setByokConfig(newConfig);
            void SettingsStorage.saveConfig(newConfig);

            if (newConfig.orchestratorServerUrl && newConfig.orchestratorServerUrl !== previousUrl) {
              socketRef.current?.disconnect();
              initSocketConnection(newConfig.orchestratorServerUrl);
            }

            if (newConfig.googleOAuthToken) {
              setActiveModel({
                provider: 'antigravity',
                modelName: 'antigravity-gemini-2.5',
                authType: 'oauth',
                oauthToken: newConfig.googleOAuthToken,
              });
            } else if (newConfig.geminiApiKey) {
              setActiveModel({
                provider: 'antigravity',
                modelName: 'antigravity-gemini-2.5',
                authType: 'api_key',
                geminiApiKey: newConfig.geminiApiKey,
              });
            } else if (newConfig.deepseekApiKey) {
              setActiveModel({
                provider: 'opencode',
                modelName: 'deepseek-coder-v2',
                apiKey: newConfig.deepseekApiKey,
              });
            } else if (newConfig.anthropicApiKey) {
              setActiveModel({
                provider: 'opencode',
                modelName: 'claude-3-5-sonnet',
                apiKey: newConfig.anthropicApiKey,
              });
            } else if (newConfig.openAiApiKey) {
              setActiveModel({
                provider: 'opencode',
                modelName: 'gpt-4o',
                apiKey: newConfig.openAiApiKey,
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
    backgroundColor: theme.colors.bgBase,
  },
  root: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
  },
});

export default App;
