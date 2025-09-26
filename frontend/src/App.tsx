import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PostsProvider } from './contexts/PostsContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Timeline from './pages/Timeline';
import Mentions from './pages/Mentions';

function App() {
  return (
    <AuthProvider>
      <PostsProvider>
        <Router>
          <div className="min-h-screen" data-theme="birdsphere">
            <Routes>
              <Route path="/" element={<Navigate to="/timeline" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/timeline" element={<ProtectedRoute><Timeline /></ProtectedRoute>} />
              <Route path="/mentions" element={<ProtectedRoute><Mentions /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/profile/edit" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/explore" element={<ProtectedRoute><div>Explore page - Coming soon</div></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><div>Messages page - Coming soon</div></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><div>Settings page - Coming soon</div></ProtectedRoute>} />
            </Routes>
          </div>
        </Router>
      </PostsProvider>
    </AuthProvider>
  );
}

export default App;
