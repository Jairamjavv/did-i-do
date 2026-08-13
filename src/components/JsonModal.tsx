import React, { useState, useEffect } from 'react';
import { X, Copy, Download, Upload, Check, FileCode, AlertCircle, RefreshCw } from 'lucide-react';

interface JsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  jsonString: string;
  onImportJSON: (jsonString: string) => { success: boolean; message: string };
  onResetData: () => void;
}

export const JsonModal: React.FC<JsonModalProps> = ({
  isOpen,
  onClose,
  jsonString,
  onImportJSON,
  onResetData,
}) => {
  const [editorText, setEditorText] = useState(jsonString);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    setEditorText(jsonString);
  }, [jsonString, isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(editorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([editorText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `did_tracker_metadata_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setEditorText(content);
        const result = onImportJSON(content);
        setFeedback({
          type: result.success ? 'success' : 'error',
          message: result.message,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleApplyChanges = () => {
    const result = onImportJSON(editorText);
    setFeedback({
      type: result.success ? 'success' : 'error',
      message: result.message,
    });
    if (result.success) {
      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-4xl h-[85vh] bg-white border-2 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 border-2 border-black bg-black text-white">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-impact text-xl uppercase tracking-wide">
                JSON Metadata Engine
              </h3>
              <p className="text-[10px] font-mono text-zinc-500">
                Direct view, edit, import, & export for all activity logs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 border-2 border-black hover:bg-black hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FEEDBACK MESSAGES */}
        {feedback && (
          <div
            className={`p-2.5 border-2 mb-3 text-xs font-mono flex items-center gap-2 flex-shrink-0 ${
              feedback.type === 'success'
                ? 'border-green-600 bg-green-50 text-green-800'
                : 'border-red-600 bg-red-50 text-red-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* TOOLBAR */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 border border-black bg-zinc-100 font-mono text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 border border-black bg-zinc-100 font-mono text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export File</span>
            </button>

            <label className="px-3 py-1.5 border border-black bg-zinc-100 font-mono text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import File</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <button
            onClick={onResetData}
            className="px-3 py-1.5 border border-zinc-400 font-mono text-xs font-bold text-zinc-600 hover:text-red-600 hover:border-red-600 flex items-center gap-1 uppercase"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Sample Data</span>
          </button>
        </div>

        {/* TEXTAREA EDITOR - OCCUPIES ~75-80% OF DIALOG HEIGHT */}
        <div className="flex-1 min-h-0 w-full">
          <textarea
            value={editorText}
            onChange={(e) => setEditorText(e.target.value)}
            className="w-full h-full p-4 border-2 border-black bg-zinc-950 text-green-400 font-mono text-xs leading-relaxed focus:outline-none resize-none shadow-inner"
            spellCheck={false}
          />
        </div>

        {/* MODAL FOOTER */}
        <div className="pt-3 mt-3 border-t-2 border-black flex items-center justify-between flex-shrink-0">
          <p className="text-[11px] font-mono text-zinc-500">
            Storage Engine: Local JSON (no external DB needed)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border-2 border-zinc-400 font-mono text-xs font-bold uppercase hover:bg-zinc-100"
            >
              Close
            </button>
            <button
              onClick={handleApplyChanges}
              className="px-5 py-2 border-2 border-black bg-black text-white font-mono text-xs font-bold uppercase hover:bg-yellow-400 hover:text-black hover:border-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              Save & Apply JSON
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
