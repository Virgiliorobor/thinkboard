import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';

interface EditorContextValue {
  editor: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const EditorContext = createContext<EditorContextValue>({
  editor: false,
  refresh: async () => {},
  logout: async () => {},
});

export function EditorProvider({ children }: { children: ReactNode }) {
  const [editor, setEditor] = useState(false);

  const refresh = async () => {
    try {
      const { editor: isEd } = await api.isEditor();
      setEditor(isEd);
    } catch {
      setEditor(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const logout = async () => {
    await api.editorLogout();
    setEditor(false);
  };

  return (
    <EditorContext.Provider value={{ editor, refresh, logout }}>{children}</EditorContext.Provider>
  );
}

export function useEditor() {
  return useContext(EditorContext);
}
