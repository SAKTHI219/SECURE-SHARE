import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import UploadFile from './pages/UploadFile';
import ShareManagement from './pages/ShareManagement';
import AccessFile from './pages/AccessFile';
import AccessLogs from './pages/AccessLogs';
import Settings from './pages/Settings';
import MyFiles from './pages/MyFiles';
import '@/App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  return (
    <div className="App noise-bg min-h-screen">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login setAuth={setIsAuthenticated} />} />
          <Route path="/register" element={<Register setAuth={setIsAuthenticated} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/access/:token" element={<AccessFile />} />
          <Route
            path="/dashboard"
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/upload"
            element={isAuthenticated ? <UploadFile /> : <Navigate to="/login" />}
          />
          <Route
            path="/share"
            element={isAuthenticated ? <ShareManagement /> : <Navigate to="/login" />}
          />
          <Route
            path="/logs"
            element={isAuthenticated ? <AccessLogs /> : <Navigate to="/login" />}
          />
          <Route
            path="/files"
            element={isAuthenticated ? <MyFiles /> : <Navigate to="/login" />}
          />
          <Route
            path="/settings"
            element={isAuthenticated ? <Settings /> : <Navigate to="/login" />}
          />
          <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;