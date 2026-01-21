import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Mail, ArrowLeft } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      toast.success('OTP sent to your email!');
      // Navigate to reset password page with email
      navigate('/reset-password', { state: { email } });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" data-testid="forgot-password-page">
      <div className="w-full max-w-md">
        <div className="glass rounded-lg p-8 space-y-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/login')}
            className="mb-4"
            data-testid="back-to-login"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Login
          </Button>

          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <ShieldCheck className="h-16 w-16 text-primary" data-testid="forgot-password-icon" />
            </div>
            <h1 className="text-4xl font-chivo font-black tracking-tight" data-testid="forgot-password-title">
              Forgot Password
            </h1>
            <p className="text-muted-foreground" data-testid="forgot-password-subtitle">
              Enter your email to receive an OTP
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="forgot-password-form">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="forgot-password-email-input"
                className="bg-secondary border-border"
              />
            </div>

            <div className="bg-primary/10 border border-primary rounded-lg p-4">
              <p className="text-sm text-primary">
                <strong>Note:</strong> An OTP will be sent to your registered email address. The OTP is valid for 10 minutes.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12"
              disabled={loading}
              data-testid="forgot-password-submit"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground" data-testid="forgot-password-login-link">
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
