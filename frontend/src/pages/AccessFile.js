import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Lock, Download, Key, Mail } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AccessFile() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Enter OTP & Password
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [ownerEmailHint, setOwnerEmailHint] = useState('');

  const handleRequestOTP = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/access/request-otp`, {
        link_token: token,
      });
      setOwnerEmailHint(response.data.owner_email_hint);
      toast.success('OTP sent to file owner! Please ask them for the OTP.');
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleAccessFile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(
        `${API}/access/verify-otp`,
        {
          link_token: token,
          otp: otp,
          password: password,
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
      if (error.response?.status === 400) {
        toast.error('Invalid or expired OTP. Please request a new one.');
        setStep(1);
        setOtp('');
      } else if (error.response?.status === 403) {
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
              Two-step verification required
            </p>
          </div>

          {step === 1 ? (
            <div className="space-y-4" data-testid="step-request-otp">
              <div className="bg-primary/10 border border-primary rounded-lg p-4">
                <p className="text-sm text-primary">
                  <strong>Step 1:</strong> An OTP will be sent to the file owner's email. Please contact the owner to get the OTP code.
                </p>
              </div>

              <Button
                onClick={handleRequestOTP}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12"
                disabled={loading}
                data-testid="request-otp-button"
              >
                {loading ? (
                  'Sending OTP to Owner...'
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Mail className="h-5 w-5" />
                    Request OTP from Owner
                  </span>
                )}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleAccessFile} className="space-y-4" data-testid="step-verify-access">
              <div className="bg-primary/10 border border-primary rounded-lg p-4">
                <p className="text-sm text-primary">
                  <strong>Step 2:</strong> OTP sent to {ownerEmailHint}. Please get the OTP from the file owner and enter it below along with the file password.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  OTP from Owner
                </Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                  data-testid="access-otp-input"
                  className="bg-secondary border-border font-mono text-lg tracking-widest text-center"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  File Password
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

              <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                <p className="text-sm text-destructive">
                  <strong>⚠️ Warning:</strong> OTP expires in 10 minutes. If you enter wrong password, you'll receive a decoy file and the owner will be alerted.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12"
                disabled={loading}
                data-testid="access-submit-button"
              >
                {loading ? (
                  'Verifying & Downloading...'
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Download className="h-5 w-5" />
                    Verify & Download File
                  </span>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setStep(1);
                  setOtp('');
                  setPassword('');
                }}
                className="w-full"
                data-testid="request-new-otp"
              >
                Request New OTP
              </Button>
            </form>
          )}

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