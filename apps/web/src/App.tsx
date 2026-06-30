import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { EditorProvider } from './hooks/useEditor';
import { Layout } from './components/Layout';
import { EditorLoginPage } from './pages/EditorLoginPage';
import { HubPage, EditorGuard } from './pages/HubPage';
import { IntakePage } from './pages/IntakePage';
import { MagazinePage } from './pages/MagazinePage';
import { EntryPage } from './pages/EntryPage';
import { CapturePage } from './pages/CapturePage';
import { InboxPage } from './pages/InboxPage';
import { TrailPage } from './pages/TrailPage';
import { SearchPage } from './pages/SearchPage';
import { UnlockResearchPage, UnlockTrailPage } from './pages/UnlockPage';

export default function App() {
  return (
    <EditorProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HubPage />} />
            <Route path="/edit" element={<EditorLoginPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/r/:slug/unlock" element={<UnlockResearchPage />} />
            <Route path="/r/:slug" element={<MagazinePage />} />
            <Route path="/r/:slug/trail/:trailId/unlock" element={<UnlockTrailPage />} />
            <Route path="/r/:slug/trail/:trailId" element={<TrailPage />} />
            <Route path="/r/:slug/entry/:id" element={<EntryPage />} />
            <Route
              path="/intake"
              element={
                <EditorGuard>
                  <IntakePage />
                </EditorGuard>
              }
            />
            <Route
              path="/r/:slug/capture"
              element={
                <EditorGuard>
                  <CapturePage />
                </EditorGuard>
              }
            />
            <Route
              path="/r/:slug/inbox"
              element={
                <EditorGuard>
                  <InboxPage />
                </EditorGuard>
              }
            />
          </Route>
          <Route path="/login" element={<Navigate to="/edit" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </EditorProvider>
  );
}
