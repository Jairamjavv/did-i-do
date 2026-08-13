import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Download,
  Upload,
  Check,
  FileCode,
  AlertCircle,
  RefreshCw,
  Cloud,
  CloudUpload,
  CloudDownload,
  Trash2,
  PlusCircle,
  Database,
  Layers,
  Code,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { MetadataRecord, ActivityMetaData } from '../types';
import { DEFAULT_METADATA_ROW_ID } from '../services/supabaseClient';
import { INITIAL_METADATA } from '../data/initialData';

interface JsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  jsonString: string;
  onImportJSON: (jsonString: string) => { success: boolean; message: string; data?: ActivityMetaData };
  onResetData: () => Promise<ActivityMetaData | void> | void;
  isSupabaseConfigured?: boolean;
  onCreateCloudSnapshot?: (customId?: string) => Promise<{ success: boolean; data?: MetadataRecord; error?: string }>;
  onFetchFromCloud?: (rowId?: string) => Promise<boolean>;
  onSaveToCloud?: (rowId?: string) => Promise<boolean>;
  onDeleteFromCloud?: (rowId?: string) => Promise<boolean>;
  onListCloudSnapshots?: () => Promise<MetadataRecord[]>;
}

export const JsonModal: React.FC<JsonModalProps> = ({
  isOpen,
  onClose,
  jsonString,
  onImportJSON,
  onResetData,
  isSupabaseConfigured = false,
  onCreateCloudSnapshot,
  onFetchFromCloud,
  onSaveToCloud,
  onDeleteFromCloud,
  onListCloudSnapshots,
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'cloud' | 'schema'>('editor');
  const [editorText, setEditorText] = useState(jsonString);
  const [copied, setCopied] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Cloud metadata CRUD states
  const [customRecordId, setCustomRecordId] = useState('');
  const [cloudRecords, setCloudRecords] = useState<MetadataRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [cloudActionLoading, setCloudActionLoading] = useState<string | null>(null);

  const SQL_SCHEMA = `-- Supabase PostgreSQL Schema for metadata table
CREATE TABLE IF NOT EXISTS metadata (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Optional Row Level Security (RLS) policies
ALTER TABLE metadata ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read & write for app usage
CREATE POLICY "Allow anon select on metadata" ON metadata FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on metadata" ON metadata FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on metadata" ON metadata FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow anon delete on metadata" ON metadata FOR DELETE TO anon USING (true);`;

  useEffect(() => {
    setEditorText(jsonString);
  }, [jsonString, isOpen]);

  // Load cloud records when switching to cloud tab
  useEffect(() => {
    if (isOpen && activeTab === 'cloud' && onListCloudSnapshots && isSupabaseConfigured) {
      loadRecords();
    }
  }, [isOpen, activeTab, isSupabaseConfigured]);

  const loadRecords = async () => {
    if (!onListCloudSnapshots) return;
    setIsLoadingRecords(true);
    try {
      const records = await onListCloudSnapshots();
      setCloudRecords(records);
    } catch (e: any) {
      setFeedback({ type: 'error', message: `Failed to load records: ${e.message}` });
    } finally {
      setIsLoadingRecords(false);
    }
  };

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(editorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
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

  // Reset Handler that updates editorText and syncs with DB
  const handleResetData = async () => {
    try {
      const res = await onResetData();
      const resetObj = res || INITIAL_METADATA;
      const freshJson = JSON.stringify(resetObj, null, 2);
      setEditorText(freshJson);
      setFeedback({
        type: 'success',
        message: 'Reset complete! Sample data restored and synced with DB.',
      });
      if (onListCloudSnapshots && isSupabaseConfigured) {
        loadRecords();
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: `Reset failed: ${e.message}` });
    }
  };

  // Cloud CRUD Handlers
  const handleCreateSnapshot = async () => {
    if (!onCreateCloudSnapshot) return;
    setCloudActionLoading('create');
    const targetId = customRecordId.trim() || `snapshot_${Date.now()}`;
    const res = await onCreateCloudSnapshot(targetId);
    setCloudActionLoading(null);
    if (res.success) {
      setFeedback({ type: 'success', message: `Record "${targetId}" created successfully!` });
      setCustomRecordId('');
      loadRecords();
    } else {
      setFeedback({ type: 'error', message: `Create failed: ${res.error}` });
    }
  };

  const handlePullCloud = async (rowId: string = DEFAULT_METADATA_ROW_ID) => {
    if (!onFetchFromCloud) return;
    setCloudActionLoading(`fetch_${rowId}`);
    const success = await onFetchFromCloud(rowId);
    setCloudActionLoading(null);
    if (success) {
      setFeedback({ type: 'success', message: `Pulled "${rowId}" from Supabase & loaded into UI!` });
      if (onListCloudSnapshots && isSupabaseConfigured) {
        loadRecords();
      }
    } else {
      setFeedback({ type: 'error', message: `Failed to fetch "${rowId}". Record may not exist.` });
    }
  };

  const handlePushCloud = async (rowId: string = DEFAULT_METADATA_ROW_ID) => {
    if (!onSaveToCloud) return;
    setCloudActionLoading(`save_${rowId}`);
    const success = await onSaveToCloud(rowId);
    setCloudActionLoading(null);
    if (success) {
      setFeedback({ type: 'success', message: `Saved / Upserted "${rowId}" to Supabase!` });
      loadRecords();
    } else {
      setFeedback({ type: 'error', message: `Failed to save "${rowId}" to Supabase.` });
    }
  };

  const handleDeleteRecord = async (rowId: string) => {
    if (!onDeleteFromCloud) return;
    if (!window.confirm(`Are you sure you want to delete "${rowId}" from Supabase metadata table?`)) return;
    setCloudActionLoading(`delete_${rowId}`);
    const success = await onDeleteFromCloud(rowId);
    setCloudActionLoading(null);
    if (success) {
      setFeedback({ type: 'success', message: `Deleted "${rowId}" from Supabase!` });
      loadRecords();
    } else {
      setFeedback({ type: 'error', message: `Failed to delete "${rowId}".` });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-4xl h-[88vh] bg-white border-2 border-black p-5 sm:p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 border-2 border-black bg-black text-white">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-impact text-xl uppercase tracking-wide">
                Metadata Engine & CRUD Hub
              </h3>
              <p className="text-[10px] font-mono text-zinc-500">
                Direct view, edit, import/export, and Supabase cloud table CRUD operations
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

        {/* TABS */}
        <div className="flex items-center gap-2 border-b-2 border-black pb-2 mb-3 flex-shrink-0">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 font-mono text-xs font-bold uppercase border-2 border-black flex items-center gap-1.5 transition-all ${
              activeTab === 'editor'
                ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-zinc-100 hover:bg-zinc-200 text-black'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>JSON Editor</span>
          </button>

          <button
            onClick={() => setActiveTab('cloud')}
            className={`px-3 py-1.5 font-mono text-xs font-bold uppercase border-2 border-black flex items-center gap-1.5 transition-all ${
              activeTab === 'cloud'
                ? 'bg-yellow-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-zinc-100 hover:bg-zinc-200 text-black'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Cloud CRUD Ops</span>
            {isSupabaseConfigured ? (
              <span className="w-2 h-2 rounded-full bg-green-600 inline-block" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-1.5 font-mono text-xs font-bold uppercase border-2 border-black flex items-center gap-1.5 transition-all ${
              activeTab === 'schema'
                ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-zinc-100 hover:bg-zinc-200 text-black'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>SQL Schema</span>
          </button>
        </div>

        {/* FEEDBACK MESSAGES */}
        {feedback && (
          <div
            className={`p-2.5 border-2 mb-3 text-xs font-mono flex items-center justify-between gap-2 flex-shrink-0 ${
              feedback.type === 'success'
                ? 'border-green-600 bg-green-50 text-green-800'
                : 'border-red-600 bg-red-50 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs font-bold uppercase hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: JSON EDITOR */}
        {activeTab === 'editor' && (
          <div className="flex-1 flex flex-col min-h-0">
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
                onClick={handleResetData}
                className="px-3 py-1.5 border border-zinc-400 font-mono text-xs font-bold text-zinc-600 hover:text-red-600 hover:border-red-600 flex items-center gap-1 uppercase"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Sample Data</span>
              </button>
            </div>

            {/* TEXTAREA EDITOR */}
            <div className="flex-1 min-h-0 w-full">
              <textarea
                value={editorText}
                onChange={(e) => setEditorText(e.target.value)}
                className="w-full h-full p-4 border-2 border-black bg-zinc-950 text-green-400 font-mono text-xs leading-relaxed focus:outline-none resize-none shadow-inner"
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {/* TAB 2: SUPABASE CLOUD CRUD OPERATIONS */}
        {activeTab === 'cloud' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-1">
            {!isSupabaseConfigured && (
              <div className="p-4 border-2 border-red-500 bg-red-50 text-red-900 mb-4 font-mono text-xs">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>Supabase Credentials Missing</span>
                </div>
                <p>
                  To use cloud CRUD operations, please configure <code className="bg-red-100 px-1 py-0.5 border border-red-300">VITE_SUPABASE_URL</code> and <code className="bg-red-100 px-1 py-0.5 border border-red-300">VITE_SUPABASE_ANON_KEY</code> in your <code className="bg-red-100 px-1 py-0.5 border border-red-300">.env</code> file.
                </p>
              </div>
            )}

            {/* QUICK CRUD ACTIONS FOR ACTIVE METADATA */}
            <div className="p-4 border-2 border-black bg-zinc-50 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h4 className="font-impact text-base uppercase mb-1 flex items-center gap-2">
                <Database className="w-4 h-4" />
                <span>Active Cloud Metadata Row (<code>app_metadata</code>)</span>
              </h4>
              <p className="font-mono text-xs text-zinc-600 mb-3">
                Perform direct Create, Read, Update, and Delete operations on the primary metadata row.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {/* READ / PULL */}
                <button
                  onClick={() => handlePullCloud(DEFAULT_METADATA_ROW_ID)}
                  disabled={!isSupabaseConfigured || Boolean(cloudActionLoading)}
                  className="px-3 py-2 border-2 border-black bg-white hover:bg-black hover:text-white text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Read & pull active metadata from Supabase cloud"
                >
                  {cloudActionLoading === `fetch_${DEFAULT_METADATA_ROW_ID}` ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CloudDownload className="w-3.5 h-3.5" />
                  )}
                  <span>Read / Pull Active</span>
                </button>

                {/* UPDATE / UPSERT */}
                <button
                  onClick={() => handlePushCloud(DEFAULT_METADATA_ROW_ID)}
                  disabled={!isSupabaseConfigured || Boolean(cloudActionLoading)}
                  className="px-3 py-2 border-2 border-black bg-yellow-400 text-black hover:bg-yellow-300 text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Update / upsert current state to Supabase active metadata row"
                >
                  {cloudActionLoading === `save_${DEFAULT_METADATA_ROW_ID}` ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CloudUpload className="w-3.5 h-3.5" />
                  )}
                  <span>Update / Push Active</span>
                </button>

                {/* DELETE */}
                <button
                  onClick={() => handleDeleteRecord(DEFAULT_METADATA_ROW_ID)}
                  disabled={!isSupabaseConfigured || Boolean(cloudActionLoading)}
                  className="px-3 py-2 border-2 border-red-600 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Delete active metadata row from Supabase"
                >
                  {cloudActionLoading === `delete_${DEFAULT_METADATA_ROW_ID}` ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>Delete Active Row</span>
                </button>
              </div>
            </div>

            {/* CREATE CUSTOM SNAPSHOT */}
            <div className="p-4 border-2 border-black bg-zinc-50 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h4 className="font-impact text-base uppercase mb-1 flex items-center gap-2">
                <PlusCircle className="w-4 h-4" />
                <span>Create New Named Metadata Record</span>
              </h4>
              <p className="font-mono text-xs text-zinc-600 mb-3">
                Insert a brand new record into the <code className="bg-zinc-200 px-1">metadata</code> table (e.g. backup, version snapshot, or separate profile).
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. snapshot_2026_08_backup or profile_work"
                  value={customRecordId}
                  onChange={(e) => setCustomRecordId(e.target.value)}
                  className="flex-1 px-3 py-2 border-2 border-black font-mono text-xs focus:outline-none"
                />
                <button
                  onClick={handleCreateSnapshot}
                  disabled={!isSupabaseConfigured || Boolean(cloudActionLoading)}
                  className="px-4 py-2 border-2 border-black bg-black text-white hover:bg-yellow-400 hover:text-black hover:border-black text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {cloudActionLoading === 'create' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PlusCircle className="w-3.5 h-3.5" />
                  )}
                  <span>Create / Insert Record</span>
                </button>
              </div>
            </div>

            {/* ALL METADATA RECORDS EXPLORER (READ / LIST / MANAGE) */}
            <div className="border-2 border-black p-4 bg-white flex-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <h4 className="font-impact text-base uppercase">
                    All Records in <code>metadata</code> Table ({cloudRecords.length})
                  </h4>
                </div>
                <button
                  onClick={loadRecords}
                  disabled={isLoadingRecords || !isSupabaseConfigured}
                  className="px-2.5 py-1 border border-black bg-zinc-100 hover:bg-zinc-200 text-[11px] font-mono font-bold uppercase flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingRecords ? 'animate-spin' : ''}`} />
                  <span>Refresh List</span>
                </button>
              </div>

              {isLoadingRecords ? (
                <div className="py-8 text-center font-mono text-xs text-zinc-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Fetching metadata records from Supabase...</span>
                </div>
              ) : cloudRecords.length === 0 ? (
                <div className="py-8 text-center font-mono text-xs text-zinc-500">
                  No records found in the Supabase metadata table. Use "Update / Push Active" or "Create / Insert Record" above to store your first record.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {cloudRecords.map((record) => {
                    const itemCount = record.data?.data?.items?.length ?? record.data?.items?.length ?? 0;
                    const isDefault = record.id === DEFAULT_METADATA_ROW_ID;
                    return (
                      <div
                        key={record.id}
                        className={`p-3 border-2 flex items-center justify-between gap-2 transition-all ${
                          isDefault ? 'border-yellow-500 bg-yellow-50/50' : 'border-zinc-300 bg-zinc-50 hover:border-black'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-black truncate">
                              {record.id}
                            </span>
                            {isDefault && (
                              <span className="px-1.5 py-0.2 bg-black text-white text-[9px] font-mono uppercase font-bold">
                                Default Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-500 mt-0.5">
                            <span>Tasks: {itemCount}</span>
                            <span>
                              Updated: {record.updated_at ? new Date(record.updated_at).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* READ / LOAD */}
                          <button
                            onClick={() => handlePullCloud(record.id)}
                            disabled={Boolean(cloudActionLoading)}
                            className="px-2 py-1 border border-black bg-white hover:bg-black hover:text-white font-mono text-[10px] font-bold uppercase transition-colors"
                            title="Load this record into application"
                          >
                            Load
                          </button>

                          {/* UPDATE */}
                          <button
                            onClick={() => handlePushCloud(record.id)}
                            disabled={Boolean(cloudActionLoading)}
                            className="px-2 py-1 border border-black bg-zinc-100 hover:bg-yellow-400 font-mono text-[10px] font-bold uppercase transition-colors"
                            title="Overwrite this record with current app state"
                          >
                            Save Over
                          </button>

                          {/* DELETE */}
                          <button
                            onClick={() => handleDeleteRecord(record.id)}
                            disabled={Boolean(cloudActionLoading)}
                            className="p-1 border border-red-400 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                            title="Delete this record"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SQL SCHEMA HELPER */}
        {activeTab === 'schema' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <p className="font-mono text-xs text-zinc-600">
                Run this SQL query in your Supabase SQL Editor (<a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1 text-black font-bold">Supabase Dashboard <ExternalLink className="w-3 h-3" /></a>) to initialize the <code>metadata</code> table.
              </p>
              <button
                onClick={handleCopySql}
                className="px-3 py-1.5 border border-black bg-black text-white font-mono text-xs font-bold uppercase hover:bg-yellow-400 hover:text-black transition-colors flex items-center gap-1.5"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL Schema'}</span>
              </button>
            </div>

            <div className="flex-1 min-h-0 w-full border-2 border-black bg-zinc-950 p-4 overflow-auto">
              <pre className="text-yellow-400 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                {SQL_SCHEMA}
              </pre>
            </div>
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="pt-3 mt-3 border-t-2 border-black flex items-center justify-between flex-shrink-0">
          <p className="text-[11px] font-mono text-zinc-500">
            {isSupabaseConfigured
              ? 'Storage Engine: Supabase Cloud PostgreSQL + Local JSON'
              : 'Storage Engine: Local JSON (Supabase not configured)'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border-2 border-zinc-400 font-mono text-xs font-bold uppercase hover:bg-zinc-100"
            >
              Close
            </button>
            {activeTab === 'editor' && (
              <button
                onClick={handleApplyChanges}
                className="px-5 py-2 border-2 border-black bg-black text-white font-mono text-xs font-bold uppercase hover:bg-yellow-400 hover:text-black hover:border-black transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                Save & Apply JSON
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

