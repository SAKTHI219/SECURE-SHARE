import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileKey, Download, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function MyFiles() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/files`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFiles(response.data.files);
    } catch (error) {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileId, filename) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/files/${fileId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

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
      toast.error('Failed to download file');
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8" data-testid="my-files-page">
      <div className="max-w-6xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          data-testid="files-back-button"
          className="mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </Button>

        <div className="glass rounded-lg p-8">
          <div className="flex items-center gap-4 mb-8">
            <FileKey className="h-12 w-12 text-primary" data-testid="files-icon" />
            <div>
              <h1 className="text-3xl font-chivo font-black tracking-tight" data-testid="files-title">
                My Encrypted Files
              </h1>
              <p className="text-muted-foreground" data-testid="files-subtitle">
                View and download your encrypted files
              </p>
            </div>
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground py-8" data-testid="files-loading">Loading...</p>
          ) : files.length === 0 ? (
            <div className="text-center py-12" data-testid="files-empty">
              <FileKey className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No files uploaded yet</p>
              <Button
                onClick={() => navigate('/upload')}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Upload Your First File
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {files.map((file, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="border border-border rounded-lg p-6 card-hover bg-card"
                  data-testid={`file-card-${idx}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <FileKey className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-semibold text-lg">{file.filename}</h3>
                        <p className="text-sm text-muted-foreground">
                          {(file.file_size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <p>
                      <strong>Uploaded:</strong> {new Date(file.upload_date).toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Status:</strong>{' '}
                      <span className="text-primary">✓ Encrypted</span>
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDownload(file.id, file.filename)}
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                      data-testid={`download-button-${idx}`}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Real File
                    </Button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      <Eye className="h-3 w-3 inline mr-1" />
                      Decoy file: {file.decoy_filename}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
