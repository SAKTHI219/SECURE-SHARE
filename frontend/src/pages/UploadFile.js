import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Upload, FileKey, EyeOff } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function UploadFile() {
  const navigate = useNavigate();
  const [realFile, setRealFile] = useState(null);
  const [decoyFile, setDecoyFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!realFile || !decoyFile) {
      toast.error('Please select both real and decoy files');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('real_file', realFile);
    formData.append('decoy_file', decoyFile);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/files/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success('Files uploaded and encrypted successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8" data-testid="upload-page">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          data-testid="upload-back-button"
          className="mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </Button>

        <div className="glass rounded-lg p-8">
          <div className="flex items-center gap-4 mb-8">
            <Upload className="h-12 w-12 text-primary" data-testid="upload-icon" />
            <div>
              <h1 className="text-3xl font-chivo font-black tracking-tight" data-testid="upload-title">
                Upload Secure Files
              </h1>
              <p className="text-muted-foreground" data-testid="upload-subtitle">
                Upload both real and decoy files for deceptive encryption
              </p>
            </div>
          </div>

          <form onSubmit={handleUpload} className="space-y-6" data-testid="upload-form">
            {/* Real File */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileKey className="h-5 w-5 text-primary" />
                <Label className="text-lg font-semibold">Real File (Encrypted)</Label>
              </div>
              <div
                className="border-2 border-dashed border-primary rounded-lg p-8 text-center hover:border-primary/80 transition-colors cursor-pointer"
                data-testid="upload-real-file-dropzone"
              >
                <input
                  type="file"
                  id="real-file"
                  onChange={(e) => setRealFile(e.target.files[0])}
                  className="hidden"
                  data-testid="upload-real-file-input"
                />
                <label htmlFor="real-file" className="cursor-pointer">
                  {realFile ? (
                    <div className="text-primary">
                      <p className="font-semibold">{realFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(realFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <FileKey className="h-12 w-12 mx-auto mb-2 text-primary" />
                      <p className="text-muted-foreground">Click to select real file</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Decoy File */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <EyeOff className="h-5 w-5 text-destructive" />
                <Label className="text-lg font-semibold">Decoy File (Shown to intruders)</Label>
              </div>
              <div
                className="border-2 border-dashed border-destructive rounded-lg p-8 text-center hover:border-destructive/80 transition-colors cursor-pointer"
                data-testid="upload-decoy-file-dropzone"
              >
                <input
                  type="file"
                  id="decoy-file"
                  onChange={(e) => setDecoyFile(e.target.files[0])}
                  className="hidden"
                  data-testid="upload-decoy-file-input"
                />
                <label htmlFor="decoy-file" className="cursor-pointer">
                  {decoyFile ? (
                    <div className="text-destructive">
                      <p className="font-semibold">{decoyFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(decoyFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <EyeOff className="h-12 w-12 mx-auto mb-2 text-destructive" />
                      <p className="text-muted-foreground">Click to select decoy file</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="bg-primary/10 border border-primary rounded-lg p-4">
              <p className="text-sm text-primary">
                <strong>How it works:</strong> When someone accesses your file with the correct password,
                they get the real file. With wrong password, they receive the decoy file while you're
                alerted via SMS and email.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12"
              disabled={uploading || !realFile || !decoyFile}
              data-testid="upload-submit-button"
            >
              {uploading ? 'Encrypting and Uploading...' : 'Upload & Encrypt Files'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}