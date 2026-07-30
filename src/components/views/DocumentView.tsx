import React, { useState } from 'react';
import { DocumentItem, User } from '../../types';
import { LanguageCode, getTranslation } from '../../lib/i18n';
import { 
  FileText, 
  Upload, 
  Search, 
  Download, 
  Trash2, 
  Filter, 
  Plus, 
  FileCheck, 
  ShieldCheck, 
  Eye, 
  FileCode, 
  FileSpreadsheet, 
  FilePlus, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FolderLock
} from 'lucide-react';

interface DocumentViewProps {
  documents: DocumentItem[];
  onUploadDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (docId: string) => void;
  currentUser: User;
  lang?: LanguageCode;
}

export const DocumentView: React.FC<DocumentViewProps> = ({
  documents,
  onUploadDocument,
  onDeleteDocument,
  currentUser,
  lang = 'en'
}) => {
  const t = (key: string, fallback?: string) => getTranslation(lang, key, fallback);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DocumentItem['category']>('Safety Policy');
  const [targetAudience, setTargetAudience] = useState<DocumentItem['targetAudience']>('All Staff');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>('');

  const isAdmin = currentUser.role === 'Owner' || currentUser.role === 'Super Admin' || currentUser.role === 'HR Admin' || currentUser.role === 'Site Supervisor';

  if (currentUser.role === 'Labor') {
    return (
      <div id="view-documents-restricted" className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl shadow-sm text-slate-300 space-y-4 my-6">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
          <FolderLock className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white">Access Restricted: Document Vault</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          The Document Vault and corporate contracts are restricted exclusively to HR Administrators, Master Owners, and authorized Site Supervisors.
        </p>
      </div>
    );
  }

  // Categories list
  const categories: DocumentItem['category'][] = [
    'Safety Policy',
    'Labor Compliance',
    'Contracts',
    'Site Permits',
    'Circulars',
    'Other'
  ];

  // Helper file icon renderer
  const getFileIcon = (fileType: DocumentItem['fileType']) => {
    switch (fileType) {
      case 'PDF':
        return <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 flex items-center justify-center font-black text-xs border border-rose-500/30">PDF</div>;
      case 'Excel':
        return <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center font-black text-xs border border-emerald-500/30">XLS</div>;
      case 'Word':
        return <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center font-black text-xs border border-indigo-500/30">DOC</div>;
      case 'Image':
        return <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center font-black text-xs border border-amber-500/30">IMG</div>;
      default:
        return <div className="w-10 h-10 rounded-xl bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400 flex items-center justify-center font-black text-xs border border-slate-500/30">FILE</div>;
    }
  };

  // Handle local File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setUploadedFileUrl(url);
    }
  };

  // Submit Upload Form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    let fileType: DocumentItem['fileType'] = 'PDF';
    let fileSize = '1.4 MB';
    let fileName = `${title.toLowerCase().replace(/\s+/g, '_')}.pdf`;

    if (selectedFile) {
      fileName = selectedFile.name;
      fileSize = `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`;
      if (selectedFile.type.includes('pdf')) fileType = 'PDF';
      else if (selectedFile.type.includes('word') || selectedFile.name.endsWith('.doc') || selectedFile.name.endsWith('.docx')) fileType = 'Word';
      else if (selectedFile.type.includes('sheet') || selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.xlsx')) fileType = 'Excel';
      else if (selectedFile.type.includes('image')) fileType = 'Image';
      else fileType = 'Other';
    }

    const newDoc: DocumentItem = {
      id: `doc-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      fileName,
      fileType,
      fileSize,
      fileUrl: uploadedFileUrl || 'data:text/plain;charset=utf-8,LMS%20by%20Umar%20Official%20Document',
      category,
      targetAudience,
      uploadedBy: `${currentUser.name} (${currentUser.role})`,
      uploadedAt: new Date().toISOString().split('T')[0]
    };

    onUploadDocument(newDoc);
    setIsUploadModalOpen(false);

    // Reset
    setTitle('');
    setDescription('');
    setSelectedFile(null);
    setUploadedFileUrl('');
  };

  // Real Trigger Browser Download
  const handleDownload = (doc: DocumentItem) => {
    const a = document.createElement('a');
    a.href = doc.fileUrl || 'data:text/plain;charset=utf-8,LMS%20by%20Umar%20Document';
    a.download = doc.fileName || `${doc.title}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Filtered list
  const filteredDocuments = documents.filter((doc) => {
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>{t('documents', 'Document Vault & Company Library')}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Secure central repository for labor compliance rules, site permits, safety policies, and employment contracts.
          </p>
        </div>

        {isAdmin && (
          <button
            id="btn-open-upload-modal"
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all flex-shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>{t('uploadDocument', 'Upload New Document')}</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {/* Search */}
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchDocuments', 'Search documents by title, keyword, or filename...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-sm"
          />
        </div>

        {/* Category Pills / Select */}
        <div className="sm:col-span-6 flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              selectedCategory === 'All'
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-500'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
            }`}
          >
            All Vault ({documents.length})
          </button>

          {categories.map((cat) => {
            const count = documents.filter((d) => d.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Document Grid Display */}
      {filteredDocuments.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
          <FileCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {t('noDocumentsFound', 'No documents found matching search filter.')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Try adjusting your search criteria or upload a new compliance document.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2.5">
                {/* Top Row: File Icon & Category Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {getFileIcon(doc.fileType)}
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 inline-block mb-1">
                        {doc.category}
                      </span>
                      <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 leading-snug line-clamp-1 group-hover:text-indigo-600 transition-colors">
                        {doc.title}
                      </h3>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {doc.description}
                </p>

                {/* Metadata Info */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl space-y-1 text-[11px] text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800/80">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-slate-600 dark:text-slate-300 font-bold">{doc.fileName}</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{doc.fileSize}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                    <span>By {doc.uploadedBy}</span>
                    <span>{doc.uploadedAt}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setPreviewDoc(doc)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Preview</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDownload(doc)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => onDeleteDocument(doc.id)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal 1: Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950 rounded-xl text-indigo-600 dark:text-indigo-400">
                  <Upload className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Upload Company Document
                </h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Riyadh Metro Site Safety Protocols 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Document Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DocumentItem['category'])}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-bold"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description & Purpose *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Provide details regarding legal compliance, site rules, or supervisor guidelines..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-normal"
                />
              </div>

              {/* Attach File Field */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Attach Document File (PDF, DOCX, XLSX, Image)
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Max file size: 15MB. PDF, DOC, XLSX, and PNG formats supported.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <FilePlus className="w-4 h-4" /> Save to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Preview Document Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {getFileIcon(previewDoc.fileType)}
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    {previewDoc.title}
                  </h3>
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                    {previewDoc.category} • {previewDoc.fileSize}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {previewDoc.description}
              </p>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <div>
                  <span className="block font-bold text-slate-800 dark:text-slate-200">File Name</span>
                  <span className="font-mono">{previewDoc.fileName}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-800 dark:text-slate-200">Uploaded By</span>
                  <span>{previewDoc.uploadedBy}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-800 dark:text-slate-200">Date Uploaded</span>
                  <span>{previewDoc.uploadedAt}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-800 dark:text-slate-200">Audience</span>
                  <span>{previewDoc.targetAudience || 'All Staff'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl font-bold text-xs"
              >
                Close
              </button>

              <button
                onClick={() => handleDownload(previewDoc)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md text-xs flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Download Official File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
