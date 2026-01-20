import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Share2, Copy, Clock, Download } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ShareManagement() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState('');
  const [password, setPassword] = useState('');
  const [expiryHours, setExpiryHours] = useState('24');
  const [downloadLimit, setDownloadLimit] = useState('10');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [filesRes, linksRes] = await Promise.all([
        axios.get(`${API}/files`, config),
        axios.get(`${API}/share/links`, config),
      ]);

      setFiles(filesRes.data.files);
      setLinks(linksRes.data.links);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLink = async () => {
    if (!selectedFile || !password) {
      toast.error('Please select file and enter password');
      return;
    }

    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/share/create`,
        {
          file_id: selectedFile,
          password,
          expiry_hours: parseInt(expiryHours),
          download_limit: parseInt(downloadLimit),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Share link created!');
      setCreateDialogOpen(false);
      setSelectedFile('');
      setPassword('');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create link');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen p-4 md:p-8" data-testid="share-management-page">
      <div className="max-w-6xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          data-testid="share-back-button"
          className="mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </Button>

        <div className="glass rounded-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Share2 className="h-12 w-12 text-primary" data-testid="share-icon" />
              <div>
                <h1 className="text-3xl font-chivo font-black tracking-tight" data-testid="share-title">
                  Share Management
                </h1>
                <p className="text-muted-foreground" data-testid="share-subtitle">
                  Create and manage secure share links
                </p>
              </div>
            </div>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="share-create-button">
                  Create Share Link
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border" data-testid="share-create-dialog">
                <DialogHeader>
                  <DialogTitle>Create Share Link</DialogTitle>
                  <DialogDescription>Configure your secure share link settings</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Select File</Label>
                    <Select value={selectedFile} onValueChange={setSelectedFile}>
                      <SelectTrigger data-testid="share-file-select">
                        <SelectValue placeholder="Choose a file" />
                      </SelectTrigger>
                      <SelectContent>
                        {files.map((file) => (
                          <SelectItem key={file.id} value={file.id}>
                            {file.filename}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Access Password</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter secure password"
                      data-testid="share-password-input"
                      className="bg-secondary border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Expiry (hours)</Label>
                    <Input
                      type="number"
                      value={expiryHours}
                      onChange={(e) => setExpiryHours(e.target.value)}
                      data-testid="share-expiry-input"
                      className="bg-secondary border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Download Limit</Label>
                    <Input
                      type="number"
                      value={downloadLimit}
                      onChange={(e) => setDownloadLimit(e.target.value)}
                      data-testid="share-limit-input"
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    onClick={handleCreateLink}
                    disabled={creating}
                    data-testid="share-create-submit-button"
                    className="bg-primary text-primary-foreground"
                  >
                    {creating ? 'Creating...' : 'Create Link'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Links List */}
          <div className="space-y-4">
            {links.length === 0 ? (
              <p className="text-muted-foreground text-center py-8" data-testid="share-no-links">No share links created yet</p>
            ) : (
              links.map((link, idx) => (
                <div
                  key={idx}
                  className="border border-border rounded-lg p-6 space-y-4 card-hover"
                  data-testid={`share-link-${idx}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{link.filename}</h3>
                      <p className="text-sm text-muted-foreground font-mono mt-1">
                        Token: {link.link_token.substring(0, 20)}...
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        link.is_active ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground'
                      }`}
                    >
                      {link.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Expires: {new Date(link.expiry_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Download className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Downloads: {link.downloads_count}/{link.download_limit}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={`${window.location.origin}/access/${link.link_token}`}
                      readOnly
                      className="bg-secondary border-border font-mono text-sm"
                    />
                    <Button
                      onClick={() => copyToClipboard(`${window.location.origin}/access/${link.link_token}`)}
                      variant="outline"
                      data-testid={`share-copy-button-${idx}`}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}