import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuth } from './hooks/useAuth';

// 使用 React.lazy 实现代码分割
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const EditorPage = lazy(() => import('./pages/EditorPage'));
const DraftsPage = lazy(() => import('./pages/DraftsPage'));
const ArticleDetail = lazy(() => import('./components/Article/ArticleDetail'));

// 加载中的占位组件
function LoadingFallback() {
  return <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '100vh',
    fontSize: '16px'
  }}>加载中...</div>;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/lab" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/editor"
            element={
              <PrivateRoute>
                <EditorPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/edit/:id"
            element={
              <PrivateRoute>
                <EditorPage />
              </PrivateRoute>
            }
          />
                <Route
                  path="/drafts"
                  element={
                    <PrivateRoute>
                      <DraftsPage />
                    </PrivateRoute>
                  }
                />
                <Route path="/article/:id" element={<ArticleDetail />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
