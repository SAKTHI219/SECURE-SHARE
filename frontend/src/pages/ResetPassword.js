import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Key, Lock, ArrowLeft } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';

  const [formData, setFormData] = useState({
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/auth/reset-password`, {
        email,
        otp: formData.otp,
        new_password: formData.newPassword,
      });
      toast.success('Password reset successful!');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No email provided</p>
          <Button onClick={() => navigate('/forgot-password')}>
            Go to Forgot Password
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" data-testid="reset-password-page">
      <div className="w-full max-w-md">
        <div className="glass rounded-lg p-8 space-y-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/forgot-password')}
            className="mb-4"
            data-testid="back-to-forgot"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </Button>

          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <ShieldCheck className="h-16 w-16 text-primary" data-testid="reset-password-icon" />
            </div>
            <h1 className="text-4xl font-chivo font-black tracking-tight" data-testid="reset-password-title">
              Reset Password
            </h1>
            <p className="text-muted-foreground" data-testid="reset-password-subtitle">
              Enter OTP sent to {email}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="reset-password-form">
            <div className="space-y-2">
              <Label htmlFor="otp" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                OTP Code
              </Label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit OTP"
                value={formData.otp}
                onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                required
                maxLength={6}
                pattern="[0-9]{6}"
                data-testid="reset-password-otp-input"
                className="bg-secondary border-border font-mono text-lg tracking-widest text-center"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                New Password
              </Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                required
                minLength={6}
                data-testid="reset-password-new-input"
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                minLength={6}
                data-testid="reset-password-confirm-input"
                className="bg-secondary border-border"
              />
            </div>

            <div className="bg-primary/10 border border-primary rounded-lg p-4">
              <p className="text-sm text-primary">
                <strong>Note:</strong> OTP is valid for 10 minutes. Password must be at least 6 characters.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12"
              disabled={loading}
              data-testid="reset-password-submit"
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground" data-testid="reset-password-login-link">
            Remember your password?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
