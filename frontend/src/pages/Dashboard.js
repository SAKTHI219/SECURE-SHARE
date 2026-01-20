import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Upload, Share2, Activity, Settings, LogOut, FileKey, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [userRes, filesRes, attemptsRes] = await Promise.all([
        axios.get(`${API}/auth/me`, config),
        axios.get(`${API}/files`, config),
        axios.get(`${API}/access/attempts`, config),
      ]);

      setUser(userRes.data);
      setFiles(filesRes.data.files);
      setAttempts(attemptsRes.data.attempts.slice(0, 5));
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const unauthorizedAttempts = attempts.filter(a => !a.password_correct);

  return (
    <div className="min-h-screen p-4 md:p-8" data-testid="dashboard">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="glass rounded-lg p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ShieldCheck className="h-12 w-12 text-primary" data-testid="dashboard-shield-icon" />
            <div>
              <h1 className="text-3xl font-chivo font-black tracking-tight" data-testid="dashboard-title">
                SecureShare Dashboard
              </h1>
              <p className="text-muted-foreground" data-testid="dashboard-welcome">Welcome back, {user?.name}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            data-testid="dashboard-logout-button"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="glass rounded-lg p-6 space-y-2"
            data-testid="dashboard-stat-files"
          >
            <FileKey className="h-8 w-8 text-primary" />
            <h3 className="text-3xl font-chivo font-bold">{files.length}</h3>
            <p className="text-muted-foreground">Encrypted Files</p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="glass rounded-lg p-6 space-y-2"
            data-testid="dashboard-stat-attempts"
          >
            <Activity className="h-8 w-8 text-primary" />
            <h3 className="text-3xl font-chivo font-bold">{attempts.length}</h3>
            <p className="text-muted-foreground">Access Attempts</p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="glass rounded-lg p-6 space-y-2 glow-red"
            data-testid="dashboard-stat-intrusions"
          >
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <h3 className="text-3xl font-chivo font-bold text-destructive">{unauthorizedAttempts.length}</h3>
            <p className="text-muted-foreground">Intrusion Attempts</p>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <div className="glass rounded-lg p-6">
          <h2 className="text-2xl font-chivo font-bold mb-6" data-testid="dashboard-quick-actions-title">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              onClick={() => navigate('/upload')}
              className="h-24 bg-primary text-primary-foreground hover:bg-primary/90 flex flex-col gap-2"
              data-testid="dashboard-upload-button"
            >
              <Upload className="h-8 w-8" />
              <span>Upload Files</span>
            </Button>

            <Button
              onClick={() => navigate('/share')}
              className="h-24 bg-secondary hover:bg-secondary/80 flex flex-col gap-2"
              data-testid="dashboard-share-button"
            >
              <Share2 className="h-8 w-8" />
              <span>Manage Shares</span>
            </Button>

            <Button
              onClick={() => navigate('/logs')}
              className="h-24 bg-secondary hover:bg-secondary/80 flex flex-col gap-2"
              data-testid="dashboard-logs-button"
            >
              <Activity className="h-8 w-8" />
              <span>View Logs</span>
            </Button>

            <Button
              onClick={() => navigate('/settings')}
              className="h-24 bg-secondary hover:bg-secondary/80 flex flex-col gap-2"
              data-testid="dashboard-settings-button"
            >
              <Settings className="h-8 w-8" />
              <span>Settings</span>
            </Button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass rounded-lg p-6">
          <h2 className="text-2xl font-chivo font-bold mb-6" data-testid="dashboard-recent-activity-title">Recent Access Attempts</h2>
          {attempts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8" data-testid="dashboard-no-attempts">No access attempts yet</p>
          ) : (
            <div className="space-y-4">
              {attempts.map((attempt, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    attempt.password_correct ? 'border-primary bg-primary/5' : 'border-destructive bg-destructive/5 glow-red'
                  }`}
                  data-testid={`dashboard-attempt-${idx}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{attempt.filename}</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {new Date(attempt.attempted_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          attempt.password_correct ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground'
                        }`}
                      >
                        {attempt.password_correct ? '✓ Authorized' : '⚠️ Intrusion'}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Served: {attempt.file_type_served}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}