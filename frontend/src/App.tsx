import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PostsProvider } from './contexts/PostsContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Timeline from './pages/Timeline';

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
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/edit" element={<Profile />} />
              <Route path="/explore" element={<div>Explore page - Coming soon</div>} />
              <Route path="/messages" element={<div>Messages page - Coming soon</div>} />
              <Route path="/settings" element={<div>Settings page - Coming soon</div>} />
            </Routes>
          </div>
        </Router>
      </PostsProvider>
    </AuthProvider>
  );
}

export default App;
