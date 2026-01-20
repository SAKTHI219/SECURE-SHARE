import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Settings as SettingsIcon, User, Mail, Phone } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
    } catch (error) {
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8" data-testid="settings-page">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          data-testid="settings-back-button"
          className="mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </Button>

        <div className="glass rounded-lg p-8">
          <div className="flex items-center gap-4 mb-8">
            <SettingsIcon className="h-12 w-12 text-primary" data-testid="settings-icon" />
            <div>
              <h1 className="text-3xl font-chivo font-black tracking-tight" data-testid="settings-title">
                Account Settings
              </h1>
              <p className="text-muted-foreground" data-testid="settings-subtitle">
                Manage your account information
              </p>
            </div>
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground py-8" data-testid="settings-loading">Loading...</p>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name
                </Label>
                <Input
                  value={user?.name || ''}
                  readOnly
                  className="bg-secondary border-border"
                  data-testid="settings-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  value={user?.email || ''}
                  readOnly
                  className="bg-secondary border-border"
                  data-testid="settings-email-input"
                />
                <p className="text-sm text-muted-foreground">
                  All alerts and notifications will be sent to this email
                </p>
              </div>

              <div className="bg-primary/10 border border-primary rounded-lg p-4 mt-6">
                <h3 className="font-semibold mb-2 text-primary">Security Features Active</h3>
                <ul className="space-y-1 text-sm">
                  <li>✓ End-to-end file encryption</li>
                  <li>✓ Deceptive file protection</li>
                  <li>✓ Email alerts enabled</li>
                  <li>✓ Access attempt logging</li>
                  <li>✓ Download your encrypted files anytime</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}