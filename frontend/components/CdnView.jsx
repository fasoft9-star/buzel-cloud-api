import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  RefreshCw,
  Search,
  Image as ImageIcon,
  FileAudio,
  FileVideo,
  FileText,
  Download,
  FolderOpen,
  X,
  HardDrive,
} from 'lucide-react';

export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function CdnView({ showToast, onStatsUpdate }) {
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState({ totalFiles: 0, totalSize: 0 });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const fileInputRef = useRef(null);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/cdn/files?limit=150');
      const data = await res.json();
      if (data.success) {
        const list = data.files || [];
        setFiles(list);
        const nextStats = {
          totalFiles: data.totalFiles || 0,
          totalSize: data.totalSize || 0,
        };
        setStats(nextStats);
        if (onStatsUpdate) onStatsUpdate(nextStats);
        if (!selectedFile && list.length > 0) {
          setSelectedFile(list[0]);
        }
      }
    } catch {
      showToast('Failed to load bucket objects', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items || [];
      for (const item of items) {
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) {
            handleUpload(f);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleUpload = (file) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      showToast('Object exceeds 20 MB limit', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setProgress(0);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/upload', true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          const newObj = {
            id: data.fileId,
            fileName: data.fileName,
            mimeType: data.mimeType,
            size: data.size,
            url: data.url,
            downloadUrl: data.downloadUrl,
            createdAt: Date.now(),
          };
          setSelectedFile(newObj);
          showToast(`Uploaded ${data.fileId} to buzelstorage`);
          fetchFiles();
        } else {
          showToast(data.error || 'Upload failed', 'error');
        }
      } catch {
        showToast('Invalid server response', 'error');
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      showToast('Network error during upload', 'error');
    };

    xhr.send(formData);
  };

  const handleCopy = async (text, id) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Public URL copied to clipboard');
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete object "${id}" from bucket buzelstorage?`)) return;
    try {
      const res = await fetch(`/cdn/files/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(`Deleted object ${id}`);
        if (selectedFile?.id === id) setSelectedFile(null);
        fetchFiles();
      }
    } catch {
      showToast('Failed to delete object', 'error');
    }
  };

  const filteredFiles = files.filter((f) => {
    const matchesSearch =
      f.id.toLowerCase().includes(search.toLowerCase()) ||
      (f.fileName || '').toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    const mime = f.mimeType || '';
    if (filter === 'image') return mime.startsWith('image/');
    if (filter === 'media') return mime.startsWith('video/') || mime.startsWith('audio/');
    if (filter === 'doc')
      return !mime.startsWith('image/') && !mime.startsWith('video/') && !mime.startsWith('audio/');
    return true;
  });

  const renderIcon = (mime = '') => {
    if (mime.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-[#3ecf8e]" />;
    if (mime.startsWith('video/')) return <FileVideo className="w-4 h-4 text-amber-400" />;
    if (mime.startsWith('audio/')) return <FileAudio className="w-4 h-4 text-sky-400" />;
    return <FileText className="w-4 h-4 text-[#898989]" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#2e2e2e]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#1c1c1c] border border-[#2e2e2e] flex items-center justify-center text-[#3ecf8e]">
            <FolderOpen className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#898989] text-xs font-mono">Buckets /</span>
            <h2 className="text-sm font-semibold text-white font-mono">buzelstorage</h2>
            <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/30 rounded">
              Public
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-4 px-3 py-1 rounded bg-[#171717] border border-[#2e2e2e] text-xs font-mono">
            <span className="text-[#898989]">
              Objects: <strong className="text-white">{stats.totalFiles}</strong>
            </span>
            <span className="text-[#2e2e2e]">|</span>
            <span className="text-[#898989]">
              Size: <strong className="text-white">{formatBytes(stats.totalSize)}</strong>
            </span>
            <span className="text-[#2e2e2e]">|</span>
            <span className="text-[#898989]">
              Local Disk: <strong className="text-[#3ecf8e]">0 MB</strong>
            </span>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#3ecf8e] hover:bg-[#34b27b] text-[#0f0f0f] font-medium text-xs transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload file</span>
          </button>

          <button
            onClick={fetchFiles}
            className="p-1.5 rounded bg-[#1c1c1c] hover:bg-[#242424] border border-[#2e2e2e] text-[#ededed] transition"
            title="Reload bucket"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#3ecf8e]' : ''}`} />
          </button>
        </div>
      </div>

      <div
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) handleUpload(e.dataTransfer.files[0]);
        }}
        className={`relative rounded-md border border-dashed transition cursor-pointer px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 ${
          dragOver
            ? 'border-[#3ecf8e] bg-[#3ecf8e]/10'
            : 'border-[#2e2e2e] hover:border-[#3ecf8e]/50 bg-[#171717]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files?.length && handleUpload(e.target.files[0])}
        />

        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded bg-[#1c1c1c] border border-[#2e2e2e] flex items-center justify-center text-[#3ecf8e] flex-shrink-0">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-white">
              Drop file here, click to browse, or press{' '}
              <kbd className="px-1.5 py-0.5 text-[11px] font-mono bg-[#242424] border border-[#363636] rounded text-[#3ecf8e]">
                Ctrl+V
              </kbd>{' '}
              to paste from clipboard
            </p>
            <p className="text-[11px] text-[#898989] mt-0.5">
              Streamed directly to Telegram Cloud Storage (@buzelstorage) • Max 20 MB per object
            </p>
          </div>
        </div>

        {uploading ? (
          <div className="w-full sm:w-56 space-y-1.5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between text-[11px] font-mono text-[#3ecf8e]">
              <span>{progress < 100 ? 'Uploading...' : 'Syncing Telegram...'}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-[#242424] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3ecf8e] transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="text-[11px] font-mono text-[#898989] hidden sm:inline">
            POST /upload
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-[#898989] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter objects by ID or filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#171717] border border-[#2e2e2e] focus:border-[#3ecf8e] rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#898989] focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#171717] border border-[#2e2e2e] rounded p-0.5 text-xs">
          {[
            { id: 'all', label: 'All Objects' },
            { id: 'image', label: 'Images' },
            { id: 'media', label: 'Audio / Video' },
            { id: 'doc', label: 'Other' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                filter === t.id
                  ? 'bg-[#242424] text-white border border-[#363636]'
                  : 'text-[#898989] hover:text-white border border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div
          className={`${
            selectedFile ? 'lg:col-span-8' : 'lg:col-span-12'
          } bg-[#171717] border border-[#2e2e2e] rounded-md overflow-hidden`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1c1c1c] border-b border-[#2e2e2e] text-[11px] font-mono uppercase text-[#898989]">
                  <th className="py-2.5 px-3.5 font-medium">Object Key</th>
                  <th className="py-2.5 px-3.5 font-medium">Original Name</th>
                  <th className="py-2.5 px-3.5 font-medium">MIME Type</th>
                  <th className="py-2.5 px-3.5 font-medium">Size</th>
                  <th className="py-2.5 px-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2e2e2e] text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-[#898989] font-mono">
                      Loading bucket objects...
                    </td>
                  </tr>
                ) : filteredFiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-[#898989]">
                      No objects found in bucket <code className="font-mono text-white">buzelstorage</code>.
                    </td>
                  </tr>
                ) : (
                  filteredFiles.map((file) => {
                    const isSelected = selectedFile?.id === file.id;
                    return (
                      <tr
                        key={file.id}
                        onClick={() => setSelectedFile(file)}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-[#3ecf8e]/10' : 'hover:bg-[#1c1c1c]'
                        }`}
                      >
                        <td className="py-2.5 px-3.5 font-mono font-medium text-white whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            {renderIcon(file.mimeType)}
                            <span className={isSelected ? 'text-[#3ecf8e]' : ''}>{file.id}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 text-[#898989] max-w-[180px] truncate">
                          {file.fileName}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-[11px] text-[#898989]">
                          {file.mimeType}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-[11px] text-[#ededed] whitespace-nowrap">
                          {formatBytes(file.size)}
                        </td>
                        <td
                          className="py-2.5 px-3.5 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleCopy(file.url, file.id)}
                              className="px-2 py-1 rounded bg-[#1c1c1c] hover:bg-[#282828] border border-[#2e2e2e] text-[11px] font-mono text-[#ededed] inline-flex items-center gap-1"
                              title="Copy URL"
                            >
                              {copiedId === file.id ? (
                                <Check className="w-3 h-3 text-[#3ecf8e]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>Copy URL</span>
                            </button>
                            <button
                              onClick={() => handleDelete(file.id)}
                              className="p-1 rounded bg-[#1c1c1c] hover:bg-red-500/20 border border-[#2e2e2e] hover:border-red-500/40 text-[#898989] hover:text-red-400 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedFile && (
          <div className="lg:col-span-4 bg-[#171717] border border-[#2e2e2e] rounded-md overflow-hidden">
            <div className="px-4 py-2.5 bg-[#1c1c1c] border-b border-[#2e2e2e] flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-white truncate">
                {selectedFile.id}
              </span>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-[#898989] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="w-full h-44 rounded bg-[#121212] border border-[#2e2e2e] flex items-center justify-center overflow-hidden">
                {(selectedFile.mimeType || '').startsWith('image/') ? (
                  <img
                    src={selectedFile.url}
                    alt={selectedFile.fileName}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (selectedFile.mimeType || '').startsWith('video/') ? (
                  <video src={selectedFile.url} controls className="max-h-full max-w-full" />
                ) : (selectedFile.mimeType || '').startsWith('audio/') ? (
                  <audio src={selectedFile.url} controls className="w-11/12" />
                ) : (
                  <div className="text-center text-[#898989] space-y-1">
                    <FileText className="w-8 h-8 mx-auto text-[#3ecf8e]" />
                    <p className="text-[11px] font-mono">{selectedFile.mimeType}</p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-xs font-mono border-t border-b border-[#2e2e2e] py-3">
                <div className="flex justify-between gap-2">
                  <span className="text-[#898989]">Filename</span>
                  <span className="text-white truncate max-w-[180px]">{selectedFile.fileName}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#898989]">Size</span>
                  <span className="text-white">{formatBytes(selectedFile.size)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#898989]">MIME</span>
                  <span className="text-[#3ecf8e]">{selectedFile.mimeType}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#898989]">Created</span>
                  <span className="text-white">
                    {new Date(selectedFile.createdAt).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono uppercase text-[#898989] block">
                  Public Object URL
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedFile.url}
                  className="w-full bg-[#121212] border border-[#2e2e2e] rounded px-2.5 py-1.5 text-xs font-mono text-[#ededed] focus:outline-none"
                />
                <button
                  onClick={() => handleCopy(selectedFile.url, 'inspector')}
                  className="w-full py-2 rounded bg-[#3ecf8e] hover:bg-[#34b27b] text-[#0f0f0f] font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  {copiedId === 'inspector' ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedId === 'inspector' ? 'Copied to Clipboard' : 'Get Public URL'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={selectedFile.downloadUrl || `${selectedFile.url}?dl=1`}
                    className="py-1.5 rounded bg-[#1c1c1c] hover:bg-[#242424] border border-[#2e2e2e] text-xs text-center font-medium text-[#ededed] flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                  <a
                    href={selectedFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-1.5 rounded bg-[#1c1c1c] hover:bg-[#242424] border border-[#2e2e2e] text-xs text-center font-medium text-[#ededed] flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
