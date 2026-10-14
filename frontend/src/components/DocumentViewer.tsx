'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DocumentItem, DocumentChunk } from '../lib/types';
import { fetchDocumentChunks } from '../lib/api';

interface DocumentViewerProps {
  document: DocumentItem | null;
  activeCitationPage: number | null;
  onExecuteTextAction: (text: string, action: 'explain' | 'summarise' | 'rewrite', page: number) => void;
  onOpenDocuments: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  activeCitationPage,
  onExecuteTextAction,
  onOpenDocuments,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState<boolean>(false);
  const [isSelectMode, setIsSelectMode] = useState<boolean>(true);

  // Floating selection popup state
  const [selectedText, setSelectedText] = useState<string>('');
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  // Jump to page when active citation changes
  useEffect(() => {
    if (activeCitationPage && activeCitationPage > 0) {
      setCurrentPage(activeCitationPage);
    }
  }, [activeCitationPage]);

  // Fetch document chunks when document or page changes
  useEffect(() => {
    if (!document) {
      setChunks([]);
      return;
    }
    let isMounted = true;
    setLoadingChunks(true);

    fetchDocumentChunks(document.id, currentPage)
      .then((data) => {
        if (isMounted) {
          setChunks(data);
          setLoadingChunks(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching document chunks:', err);
        if (isMounted) setLoadingChunks(false);
      });

    return () => {
      isMounted = false;
    };
  }, [document, currentPage]);

  // Handle user text selection
  const handleMouseUp = () => {
    if (!isSelectMode) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setPopupPos(null);
      setSelectedText('');
      return;
    }

    const text = selection.toString().trim();
    if (text.length > 5) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = paperRef.current?.getBoundingClientRect();

      if (containerRect) {
        setPopupPos({
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top - 10,
        });
        setSelectedText(text);
      }
    } else {
      setPopupPos(null);
      setSelectedText('');
    }
  };

  const totalPages = document?.page_count || 3;
  const docTitle = document?.filename || 'The Future of Renewable Energy.pdf';

  return (
    <section className="document-viewer-panel" aria-label="Interactive Document Viewer">
      {/* Top Document Notice Banner */}
      <div className="doc-top-banner">
        <span>Ask me about <strong>{docTitle}</strong>.</span>
        <span className="link-view" onClick={onOpenDocuments} id="btn-view-doc-banner">
          View Doc
        </span>
      </div>

      {/* Main Document Canvas */}
      <div className="doc-paper-container">
        <div
          ref={paperRef}
          className="pdf-paper-page"
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          onMouseUp={handleMouseUp}
          id="pdf-paper-canvas"
        >
          {/* Watermark identifier matching academic research papers */}
          <div className="paper-watermark">
            arXiv:2311.17853v1 [cs.LG] • Page {currentPage}
          </div>

          {/* Floating Action Popup on Text Selection */}
          {popupPos && selectedText && (
            <div
              className="selection-popup"
              style={{ left: `${popupPos.x}px`, top: `${popupPos.y}px` }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                className="popup-btn primary"
                onClick={() => {
                  onExecuteTextAction(selectedText, 'explain', currentPage);
                  setPopupPos(null);
                }}
                id="btn-popup-explain"
              >
                Explain
              </button>
              <button
                className="popup-btn"
                onClick={() => {
                  onExecuteTextAction(selectedText, 'summarise', currentPage);
                  setPopupPos(null);
                }}
                id="btn-popup-summarise"
              >
                Summarise
              </button>
              <button
                className="popup-btn"
                onClick={() => {
                  onExecuteTextAction(selectedText, 'rewrite', currentPage);
                  setPopupPos(null);
                }}
                id="btn-popup-rewrite"
              >
                Rewrite
              </button>
            </div>
          )}

          {/* Page Content Rendering */}
          {currentPage === 1 && (
            <div>
              <h1 className="paper-title">
                {document?.filename.replace('.pdf', '') || 'The Future of Renewable Energy: Grid Modernization & Machine Learning'}
              </h1>
              <div className="paper-authors">
                Filippo Guerranti, Zinuo Yi, Anna Starovoit, Rafiq Kamel, Simon Geisler
              </div>
              <div className="paper-inst">
                Department of Computer Science & Munich Data Science Institute<br />
                Technical University of Munich
              </div>

              <div className="paper-abstract">
                <div className="paper-abstract-title">Abstract</div>
                <p>
                  Contrastive learning (CL) has emerged as a powerful framework for modeling power grid resilience and renewable energy fluctuations. Modern energy networks require real-time telemetry processing across solar irradiance forecasting, wind velocity modeling, and grid-scale battery storage strategies. In this paper, we evaluate proactive anomaly detection and telemetry embedding projections to guarantee grid stability under adverse weather conditions.
                </p>
              </div>

              <h2 className="paper-section-heading">1 Introduction</h2>
              <p style={{ marginBottom: '14px', textAlign: 'justify' }}>
                Global transition to zero-carbon energy distribution mandates high-frequency forecasting and autonomous load balancing across distributed power networks. Traditional numerical weather prediction models exhibit latency bottlenecks of up to 4 hours. Deep temporal spatial-temporal transformers reduce forecast deviation by over 24%, enabling proactive storage dispatch and curtailment avoidance.
              </p>

              {/* Render dynamic chunks if available */}
              {chunks.length > 0 && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {chunks.map((c) => (
                    <div
                      key={c.id}
                      className={activeCitationPage === c.page_number ? 'citation-highlight-pulse' : ''}
                      style={{ padding: '8px', borderRadius: '4px', background: '#fcfcfc', border: '1px solid #f1f3f7' }}
                    >
                      {c.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentPage === 2 && (
            <div>
              <h2 className="paper-section-heading">2 System Architecture & Methodology</h2>
              <p style={{ marginBottom: '14px', textAlign: 'justify' }}>
                <strong>2.1 Telemetry Sensor Network:</strong> The distributed sensor network continuously ingests phase angle, frequency, and active power at 60 Hz sampling rates from 144 phasor measurement units (PMUs). The data stream is partitioned into rolling 15-minute observation windows.
              </p>
              <p style={{ marginBottom: '14px', textAlign: 'justify' }}>
                <strong>2.2 Contrastive Embedding Generation:</strong> Telemetry windows are mapped into a 384-dimensional dense latent space using a self-supervised encoder trained on historical telemetry sequences. Cosine similarity in this embedding space corresponds directly to voltage stability margins.
              </p>
              <p style={{ marginBottom: '14px', textAlign: 'justify' }}>
                <strong>2.3 Predictive Control Loop:</strong> When similarity scores drop below 0.35 against nominal grid archetypes, an automated reserve injection command is dispatched to local battery energy storage systems (BESS).
              </p>

              {chunks.length > 0 && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {chunks.map((c) => (
                    <div
                      key={c.id}
                      className={activeCitationPage === c.page_number ? 'citation-highlight-pulse' : ''}
                      style={{ padding: '8px', borderRadius: '4px', background: '#fcfcfc', border: '1px solid #f1f3f7' }}
                    >
                      {c.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentPage >= 3 && (
            <div>
              <h2 className="paper-section-heading">3 Experimental Validation & Results</h2>
              <p style={{ marginBottom: '14px', textAlign: 'justify' }}>
                <strong>3.1 Microgrid Benchmark:</strong> Field evaluations across 12 commercial microgrids demonstrated significant gains:
              </p>
              <ul style={{ paddingLeft: '24px', marginBottom: '14px' }}>
                <li>Root Mean Square Error (RMSE): 0.042 (down from 0.078 in baseline ARIMA models).</li>
                <li>Mean Absolute Error (MAE): 0.031.</li>
                <li>Battery Lifecycle Improvement: 18.4% degradation reduction through peak-smoothing.</li>
              </ul>
              <p style={{ marginBottom: '14px', textAlign: 'justify' }}>
                <strong>3.2 Conclusion:</strong> Proactive vector representations guarantee grid stability while maximizing the dispatch efficiency of stored renewable energy.
              </p>

              {chunks.length > 0 && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {chunks.map((c) => (
                    <div
                      key={c.id}
                      className={activeCitationPage === c.page_number ? 'citation-highlight-pulse' : ''}
                      style={{ padding: '8px', borderRadius: '4px', background: '#fcfcfc', border: '1px solid #f1f3f7' }}
                    >
                      {c.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom PDF Toolbar */}
      <footer className="doc-bottom-toolbar" role="toolbar" aria-label="PDF Controls">
        <div className="doc-tools-group">
          {/* Zoom Out */}
          <button
            className="doc-tool-icon-btn"
            title="Zoom Out"
            onClick={() => setZoomLevel((prev) => Math.max(70, prev - 10))}
            id="btn-zoom-out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>

          {/* Zoom In */}
          <button
            className="doc-tool-icon-btn"
            title="Zoom In"
            onClick={() => setZoomLevel((prev) => Math.min(140, prev + 10))}
            id="btn-zoom-in"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>

          {/* Reset Zoom */}
          <button
            className="doc-tool-icon-btn"
            title="Fit to Width (100%)"
            onClick={() => setZoomLevel(100)}
            id="btn-zoom-fit"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>

          {/* Select Text Mode */}
          <button
            className="doc-tool-pill"
            style={{ background: isSelectMode ? '#0f172a' : '#94a3b8' }}
            title="Toggle Text Selection Mode"
            onClick={() => setIsSelectMode(!isSelectMode)}
            id="btn-select-text-mode"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7V4h16v3" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
            <span>Select a text</span>
          </button>
        </div>

        {/* Page Indicator and Navigation */}
        <div className="page-indicator-badge">
          <button
            className="page-nav-arrow"
            title="Previous Page"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            id="btn-prev-page"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            className="page-nav-arrow"
            title="Next Page"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            id="btn-next-page"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </footer>
    </section>
  );
};
