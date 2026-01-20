import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Activity, ShieldCheck, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AccessLogs() {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadAttempts();
  }, []);

  const loadAttempts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/access/attempts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAttempts(response.data.attempts);
    } catch (error) {
      toast.error('Failed to load access logs');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockLink = async (attemptId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/owner/action`,
        { attempt_id: attemptId, action: 'block' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Link blocked successfully');
      loadAttempts();
    } catch (error) {
      toast.error('Failed to block link');
    }
  };

  const filteredAttempts = attempts.filter((attempt) => {
    if (filter === 'authorized') return attempt.password_correct;
    if (filter === 'intrusions') return !attempt.password_correct;
    return true;
  });

  return (
    <div className="min-h-screen p-4 md:p-8" data-testid="access-logs-page">
      <div className="max-w-6xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          data-testid="logs-back-button"
          className="mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </Button>

        <div className="glass rounded-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Activity className="h-12 w-12 text-primary" data-testid="logs-icon" />
              <div>
                <h1 className="text-3xl font-chivo font-black tracking-tight" data-testid="logs-title">
                  Access Logs
                </h1>
                <p className="text-muted-foreground" data-testid="logs-subtitle">
                  Monitor all file access attempts
                </p>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                data-testid="logs-filter-all"
                className={filter === 'all' ? 'bg-primary text-primary-foreground' : ''}
              >
                All
              </Button>
              <Button
                variant={filter === 'authorized' ? 'default' : 'outline'}
                onClick={() => setFilter('authorized')}
                data-testid="logs-filter-authorized"
                className={filter === 'authorized' ? 'bg-primary text-primary-foreground' : ''}
              >
                Authorized
              </Button>
              <Button
                variant={filter === 'intrusions' ? 'default' : 'outline'}
                onClick={() => setFilter('intrusions')}
                data-testid="logs-filter-intrusions"
                className={filter === 'intrusions' ? 'bg-destructive text-destructive-foreground' : ''}
              >
                Intrusions
              </Button>
            </div>
          </div>

          {/* Logs List */}
          <div className="space-y-4">
            {loading ? (
              <p className="text-center text-muted-foreground py-8" data-testid="logs-loading">Loading...</p>
            ) : filteredAttempts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8" data-testid="logs-no-attempts">No access attempts found</p>
            ) : (
              filteredAttempts.map((attempt, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`border rounded-lg p-6 ${
                    attempt.password_correct
                      ? 'border-primary bg-primary/5'
                      : 'border-destructive bg-destructive/5 glow-red'
                  }`}
                  data-testid={`log-entry-${idx}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {attempt.password_correct ? (
                        <CheckCircle className="h-8 w-8 text-primary mt-1" />
                      ) : (
                        <AlertTriangle className="h-8 w-8 text-destructive mt-1" />
                      )}

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{attempt.filename}</h3>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              attempt.password_correct
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-destructive text-destructive-foreground'
                            }`}
                          >
                            {attempt.password_correct ? '✓ Authorized' : '⚠️ Intrusion'}
                          </span>
                        </div>

                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p className="font-mono">
                            <strong>Time:</strong> {new Date(attempt.attempted_at).toLocaleString()}
                          </p>
                          <p className="font-mono">
                            <strong>File Served:</strong>{' '}
                            <span
                              className={attempt.file_type_served === 'real' ? 'text-primary' : 'text-destructive'}
                            >
                              {attempt.file_type_served}
                            </span>
                          </p>
                          {attempt.verification_code && (
                            <p className="font-mono">
                              <strong>Verification Code:</strong>{' '}
                              <span className="text-destructive font-bold">{attempt.verification_code}</span>
                            </p>
                          )}
                          <p className="font-mono">
                            <strong>IP:</strong> {attempt.ip_address}
                          </p>
                        </div>
                      </div>
                    </div>

                    {!attempt.password_correct && (
                      <Button
                        variant="destructive"
                        onClick={() => handleBlockLink(attempt.id)}
                        data-testid={`log-block-button-${idx}`}
                        className="bg-destructive text-destructive-foreground"
                      >
                        Block Link
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}