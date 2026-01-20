import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Lock, Download } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AccessFile() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAccess = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(
        `${API}/access/file`,
        {
          link_token: token,
          password,
        },
        {
          responseType: 'blob',
        }
      );

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'download';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('File downloaded successfully!');
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error(error.response?.data?.detail || 'Access denied');
      } else if (error.response?.status === 404) {
        toast.error('Invalid or expired link');
      } else {
        toast.error('Failed to access file');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" data-testid="access-file-page">
      <div className="w-full max-w-md">
        <div className="glass rounded-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <ShieldCheck className="h-16 w-16 text-primary" data-testid="access-shield-icon" />
            </div>
            <h1 className="text-4xl font-chivo font-black tracking-tight" data-testid="access-title">
              Secure File Access
            </h1>
            <p className="text-muted-foreground" data-testid="access-subtitle">
              Enter the password to access this file
            </p>
          </div>

          <form onSubmit={handleAccess} className="space-y-4" data-testid="access-form">
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Access Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="access-password-input"
                className="bg-secondary border-border"
              />
            </div>

            <div className="bg-primary/10 border border-primary rounded-lg p-4">
              <p className="text-sm text-primary">
                <strong>Note:</strong> This link is protected with encryption. The owner will be notified
                of your access attempt.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12"
              disabled={loading}
              data-testid="access-submit-button"
            >
              {loading ? (
                'Accessing...'
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Download className="h-5 w-5" />
                  Access & Download File
                </span>
              )}
            </Button>
          </form>

          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/login')}
              className="text-sm text-muted-foreground"
              data-testid="access-login-link"
            >
              Have an account? Sign In
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}