'use client';

import React, { useState, useRef } from 'react';
import { DocumentItem } from '../lib/types';
import { uploadDocument, deleteDocument } from '../lib/api';

interface DocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  activeDocumentId: string | null;
  onSelectDocument: (doc: DocumentItem) => void;
  onRefreshDocuments: () => void;
}

export const DocumentsModal: React.FC<DocumentsModalProps> = ({
  isOpen,
  onClose,
  documents,
  activeDocumentId,
  onSelectDocument,
  onRefreshDocuments,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [forceOcr, setForceOcr] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please select a valid PDF file.');
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    let timer2: ReturnType<typeof setTimeout> | undefined;

    try {
      setIsUploading(true);
      setUploadStage('Extracting text with PyMuPDF...');
      
      // Stage progress simulation for user clarity
      timer = setTimeout(() => {
        setUploadStage(forceOcr ? 'Executing Tesseract OCR on scanned page layouts...' : 'Analyzing document pages and layout...');
      }, 1200);

      timer2 = setTimeout(() => {
        setUploadStage('Generating 384-dimensional embeddings (Sentence Transformers)...');
      }, 2500);

      const uploadedDoc = await uploadDocument(file, forceOcr);
      clearTimeout(timer);
      clearTimeout(timer2);

      setUploadStage('Indexing vectors into database...');
      setTimeout(() => {
        setIsUploading(false);
        onRefreshDocuments();
        onSelectDocument(uploadedDoc);
      }, 600);
    } catch (err: any) {
      clearTimeout(timer);
      clearTimeout(timer2);
      alert(`Upload error: ${err.message || 'Failed to upload document'}`);
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (docId: string, filename: string) => {
    if (confirm(`Delete "${filename}" and its vector index?`)) {
      try {
        await deleteDocument(docId);
        onRefreshDocuments();
      } catch (e: any) {
        alert(`Failed to delete document: ${e.message}`);
      }
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title">Document Library & OCR Pipeline</div>
          <button className="modal-close-btn" onClick={onClose} title="Close Modal" id="btn-close-modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Dropzone */}
          <div
            className={`dropzone-area ${isDragOver ? 'drag-active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            id="dropzone-pdf"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px auto' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
              Click to upload or drag & drop PDF files
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Supports native digital PDFs and scanned image documents via Tesseract OCR
            </div>
          </div>

          {/* OCR Toggle */}
          <div className="ocr-toggle-row">
            <div>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>Force Deep Tesseract OCR</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Performs optical character recognition on every page regardless of digital text density
              </div>
            </div>
            <input
              type="checkbox"
              checked={forceOcr}
              onChange={(e) => setForceOcr(e.target.checked)}
              id="checkbox-force-ocr"
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
          </div>

          {/* Uploading progress status */}
          {isUploading && (
            <div style={{ padding: '14px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="animate-spin" style={{ fontSize: '18px', color: '#f59e0b' }}>⚙</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#92400e' }}>Processing Document Pipeline</div>
                <div style={{ fontSize: '12px', color: '#b45309' }}>{uploadStage}</div>
              </div>
            </div>
          )}

          {/* Uploaded Documents List */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
              Indexed Documents ({documents.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {documents.map((doc) => {
                const isSelected = activeDocumentId === doc.id;
                const sizeKb = Math.round(doc.file_size / 1024);

                return (
                  <div
                    key={doc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                      background: isSelected ? '#fffdf7' : '#ffffff',
                    }}
                    id={`doc-card-${doc.id}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {doc.filename}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '8px', marginTop: '2px' }}>
                          <span>{sizeKb} KB</span>
                          <span>•</span>
                          <span>{doc.page_count} page{doc.page_count > 1 ? 's' : ''}</span>
                          <span>•</span>
                          <span>{doc.chunks_count} chunks</span>
                          {doc.ocr_applied && (
                            <>
                              <span>•</span>
                              <span style={{ color: '#059669', fontWeight: 600 }}>OCR applied</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="popup-btn"
                        style={{
                          background: isSelected ? '#0f172a' : '#f1f5f9',
                          color: isSelected ? '#ffffff' : '#334155',
                          fontSize: '11.5px',
                        }}
                        onClick={() => {
                          onSelectDocument(doc);
                          onClose();
                        }}
                        id={`btn-select-doc-${doc.id}`}
                      >
                        {isSelected ? 'Active' : 'Select'}
                      </button>

                      <button
                        className="action-icon-btn"
                        title="Delete document"
                        onClick={() => handleDelete(doc.id, doc.filename)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}

              {documents.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  No documents uploaded yet. Upload a PDF above to get started.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
