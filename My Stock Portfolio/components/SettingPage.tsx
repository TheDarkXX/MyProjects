import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Portfolio, CloudBackup } from '../types';
import { supabaseUrl, supabaseAnonKey } from '../lib/supabaseClient';
import { formatToUserTimezone } from '../lib/logging';
import { useBackupAndRestore, ConfirmationModal } from './BackupPage';

type ApiStatus = 'valid' | 'default' | 'error' | 'testing' | 'untested';

const testFinnhubApiKey = async (key: string): Promise<boolean> => {
  if (!key) return false;
  try {
      const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${key}`);
      return response.ok;
  } catch {
      return false;
  }
};

const testPolygonApiKey = async (key: string): Promise<boolean> => {
    if (!key) return false;
    try {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 2); // Go back 2 days to ensure there's data
        const from = yesterday.toISOString().split('T')[0];
        
        const response = await fetch(`https://api.polygon.io/v2/aggs/ticker/AAPL/range/1/day/${from}/${today.toISOString().split('T')[0]}?apiKey=${key}`);
        if (!response.ok) return false;
        const data = await response.json();
        return data.status === 'OK';
    } catch {
        return false;
    }
};

const DEFAULT_FINNHUB_KEY = 'd383nj1r01qlbdj3p8q0d383nj1r01qlbdj3p8qg';
const DEFAULT_POLYGON_KEY = 'nU1_qIjq8inMDa7CXUjPETsl6TY0OHQD';

interface SettingPageProps {
  apiStatus: ApiStatus;
  setApiStatus: (status: ApiStatus) => void;
  dbError: string | null;
  portfolios: Portfolio[];
  setNotification: (message: string, type: 'success' | 'error') => void;
  onManualBackup: (summary: string) => Promise<void>;
}

const SettingPage: React.FC<SettingPageProps> = ({ 
    apiStatus, setApiStatus, dbError, portfolios, setNotification, onManualBackup
}) => {
  const [inputFinnhubKey, setInputFinnhubKey] = useState<string>('');
  const [finnhubApiKey, setFinnhubApiKey] = useState<string>('');
  const [showFinnhubKey, setShowFinnhubKey] = useState<boolean>(false);
  const [lastUpdatedFinnhub, setLastUpdatedFinnhub] = useState<string | null>(null);
  const [isTestingFinnhub, setIsTestingFinnhub] = useState<boolean>(false);
  const [feedbackFinnhub, setFeedbackFinnhub] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [inputPolygonKey, setInputPolygonKey] = useState<string>('');
  const [polygonApiKey, setPolygonApiKey] = useState<string>('');
  const [showPolygonKey, setShowPolygonKey] = useState<boolean>(false);
  const [lastUpdatedPolygon, setLastUpdatedPolygon] = useState<string | null>(null);
  const [isTestingPolygon, setIsTestingPolygon] = useState<boolean>(false);
  const [feedbackPolygon, setFeedbackPolygon] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // --- Backup & Restore Logic ---
  const manager = useBackupAndRestore({ setNotification, portfolios });
  const { 
    isExportingLocal, isImportingLocal, lastError, importLocalBackup, handleMerge,
    isFetchingCloud, cloudBackups, handleRestore, handleExport, handleDelete,
    showRestoreConfirm, showDeleteConfirm, backupInModal,
    closeModals, confirmRestore, confirmDelete, fetchCloudBackups
  } = manager;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [restoreMode, setRestoreMode] = useState<'full' | 'merge'>('full');
  const [targetPortfolioId, setTargetPortfolioId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (portfolios.length > 0) {
        const doctorbank = portfolios.find(p => p.name === "Doctorbank Growth");
        setTargetPortfolioId(doctorbank ? doctorbank.id : portfolios[0].id);
    }
  }, [portfolios]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
  };

  const handleRestoreClick = () => {
      if(!selectedFile) {
          setNotification('Please select a backup file first.', 'error');
          return;
      }
      if (restoreMode === 'full') {
          importLocalBackup(selectedFile);
      } else {
          if (targetPortfolioId) {
              handleMerge(selectedFile, targetPortfolioId);
          } else {
              setNotification('Please select a target portfolio for the merge.', 'error');
          }
      }
      setSelectedFile(null);
      if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleManualBackup = async () => {
    setIsBackingUp(true);
    try {
      await onManualBackup('Manual Cloud Backup');
      setNotification('Manual backup created successfully! Refreshing list...', 'success');
      // Wait a moment for DB to update before refetching
      setTimeout(() => {
          fetchCloudBackups();
      }, 1000);
    } catch (error) {
      setNotification('Failed to create manual backup.', 'error');
    } finally {
      setIsBackingUp(false);
    }
  };


  useEffect(() => {
    const savedKey = localStorage.getItem('finnhub_api_key');
    const savedTimestamp = localStorage.getItem('finnhub_api_key_updated');
    if (savedKey) { setFinnhubApiKey(savedKey); setInputFinnhubKey(savedKey); } 
    else { setFinnhubApiKey(DEFAULT_FINNHUB_KEY); setInputFinnhubKey(DEFAULT_FINNHUB_KEY); }
    if (savedTimestamp) setLastUpdatedFinnhub(savedTimestamp);

    const savedPolygonKey = localStorage.getItem('polygon_api_key');
    const savedPolygonTimestamp = localStorage.getItem('polygon_api_key_updated');
    if (savedPolygonKey) { setPolygonApiKey(savedPolygonKey); setInputPolygonKey(savedPolygonKey); }
    else { setPolygonApiKey(DEFAULT_POLYGON_KEY); setInputPolygonKey(DEFAULT_POLYGON_KEY); }
    if (savedPolygonTimestamp) setLastUpdatedPolygon(savedTimestamp);
  }, []);

  useEffect(() => { if (showFinnhubKey) { const timer = setTimeout(() => setShowFinnhubKey(false), 5000); return () => clearTimeout(timer); } }, [showFinnhubKey]);
  useEffect(() => { if (showPolygonKey) { const timer = setTimeout(() => setShowPolygonKey(false), 5000); return () => clearTimeout(timer); } }, [showPolygonKey]);
  
  const showFeedback = (setter: React.Dispatch<any>, message: string, type: 'success' | 'error' | 'info') => {
      setter({ message, type });
      setTimeout(() => setter(null), 4000);
  };

  const handleSaveFinnhub = useCallback(() => {
    if (!inputFinnhubKey) { showFeedback(setFeedbackFinnhub, 'API Key cannot be empty.', 'error'); return; }
    const now = new Date();
    localStorage.setItem('finnhub_api_key', inputFinnhubKey);
    localStorage.setItem('finnhub_api_key_updated', now.toISOString());
    setFinnhubApiKey(inputFinnhubKey); setLastUpdatedFinnhub(now.toISOString()); setApiStatus('valid');
    showFeedback(setFeedbackFinnhub, 'Finnhub API Key saved successfully.', 'success');
  }, [inputFinnhubKey, setApiStatus]);

  const handleTestFinnhub = useCallback(async () => {
    setIsTestingFinnhub(true); setApiStatus('testing'); setFeedbackFinnhub(null);
    const isValid = await testFinnhubApiKey(inputFinnhubKey);
    setIsTestingFinnhub(false);
    if (isValid) { setApiStatus('valid'); showFeedback(setFeedbackFinnhub, `API Key is valid.`, 'success'); } 
    else { setApiStatus('error'); showFeedback(setFeedbackFinnhub, 'API Key is invalid.', 'error'); }
  }, [inputFinnhubKey, setApiStatus]);
  
  const handleDeleteFinnhub = useCallback(() => {
    localStorage.removeItem('finnhub_api_key'); localStorage.removeItem('finnhub_api_key_updated');
    setFinnhubApiKey(DEFAULT_FINNHUB_KEY); setInputFinnhubKey(DEFAULT_FINNHUB_KEY); setLastUpdatedFinnhub(null); setApiStatus('default');
    showFeedback(setFeedbackFinnhub, 'API Key deleted. Falling back to default.', 'info');
  }, [setApiStatus]);

  const handleSavePolygon = useCallback(() => {
    if (!inputPolygonKey) { showFeedback(setFeedbackPolygon, 'API Key cannot be empty.', 'error'); return; }
    const now = new Date();
    localStorage.setItem('polygon_api_key', inputPolygonKey);
    localStorage.setItem('polygon_api_key_updated', now.toISOString());
    setPolygonApiKey(inputPolygonKey); setLastUpdatedPolygon(now.toISOString());
    showFeedback(setFeedbackPolygon, 'Polygon.io API Key saved successfully.', 'success');
  }, [inputPolygonKey]);

  const handleTestPolygon = useCallback(async () => {
    setIsTestingPolygon(true); setFeedbackPolygon(null);
    const isValid = await testPolygonApiKey(inputPolygonKey);
    setIsTestingPolygon(false);
    if (isValid) { showFeedback(setFeedbackPolygon, `API Key appears valid.`, 'success'); } 
    else { showFeedback(setFeedbackPolygon, 'API Key is invalid or rate limited.', 'error'); }
  }, [inputPolygonKey]);
  
  const handleDeletePolygon = useCallback(() => {
    localStorage.removeItem('polygon_api_key'); localStorage.removeItem('polygon_api_key_updated');
    setPolygonApiKey(DEFAULT_POLYGON_KEY); setInputPolygonKey(DEFAULT_POLYGON_KEY); setLastUpdatedPolygon(null);
    showFeedback(setFeedbackPolygon, 'API Key deleted. Falling back to default.', 'info');
  }, []);

  const maskApiKey = (key: string) => key.length <= 4 ? '****' : '************' + key.slice(-4);
  const maskUrl = (url: string) => {
      try { const urlObj = new URL(url); const parts = urlObj.hostname.split('.'); if (parts.length < 2) return url;
          const subdomain = parts[0];
          return subdomain.length > 8 ? `${urlObj.protocol}//${subdomain.slice(0, 4)}...${subdomain.slice(-4)}.${parts.slice(1).join('.')}` : url;
      } catch { return "Invalid URL"; }
  };
  const maskString = (key: string) => key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : '****';

  const statusBanner = useMemo(() => {
    switch(apiStatus) {
      case 'valid': return { color: 'green', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>, text: 'A valid Finnhub API key is configured and active.' };
      case 'default': return { color: 'yellow', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.636-1.226 2.85-1.226 3.486 0l5.58 10.762c.636 1.226-.472 2.639-1.743 2.639H4.42c-1.27 0-2.379-1.413-1.743-2.639l5.58-10.762zM10 14a1 1 0 100-2 1 1 0 000 2zm-1-3a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" /></svg>, text: 'Using default Finnhub key. Add your own key for live data.' };
      case 'error': return { color: 'red', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>, text: 'Current Finnhub API key is invalid.' };
      default: return null;
    }
  }, [apiStatus]);

  if (isFetchingCloud) {
    return (
        <div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-150px)]">
            <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <p className="mt-4 text-lg text-gray-400">Loading Settings...</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 text-white">
      <ConfirmationModal 
          isOpen={showRestoreConfirm}
          onClose={closeModals}
          onConfirm={confirmRestore}
          title="Confirm Full Data Restore"
          message={<>Are you sure you want to restore this cloud backup? This will <strong className="text-red-400">permanently overwrite all</strong> of your current portfolio and transaction data.</>}
          confirmText="Yes, Overwrite All Data"
          confirmColor="bg-red-600 hover:bg-red-500"
      />
      <ConfirmationModal 
          isOpen={showDeleteConfirm}
          onClose={closeModals}
          onConfirm={confirmDelete}
          title="Confirm Cloud Backup Deletion"
          message="Are you sure you want to delete this cloud backup? This action cannot be undone."
          confirmText="Yes, Delete"
      />

      <h1 className="text-2xl sm:text-3xl font-bold mb-4">Settings</h1>
      
      {statusBanner && (
        <div className={`flex items-center p-4 mb-6 rounded-lg border-l-4 ${statusBanner.color === 'green' ? 'bg-green-900/50 border-green-500 text-green-200' : statusBanner.color === 'yellow' ? 'bg-yellow-900/50 border-yellow-500 text-yellow-200' : 'bg-red-900/50 border-red-500 text-red-200'}`} role="alert">
          {statusBanner.icon} <span className="text-sm">{statusBanner.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Connections & API Keys */}
        <div className="space-y-6">
            <div className="bg-[#111827] rounded-lg shadow-2xl p-6">
                <h2 className="text-xl font-semibold mb-2">Supabase Connection</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-md">
                        <span>Status:</span>
                        {dbError ? (<div className="flex items-center space-x-2 text-red-400"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]"></div><span>Error</span></div>) 
                        : (<div className="flex items-center space-x-2 text-green-400"><div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.7)]"></div><span>Connected</span></div>)}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-md"><span>Project URL:</span><span className="font-mono text-sm">{maskUrl(supabaseUrl)}</span></div>
                    <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-md"><span>Anon Key:</span><span className="font-mono text-sm">{maskString(supabaseAnonKey)}</span></div>
                    {dbError && (<div className="text-xs text-red-300 bg-red-900/50 p-3 rounded-md mt-2"><strong>Error Details:</strong> {dbError}</div>)}
                </div>
            </div>

            <div className="bg-[#111827] rounded-lg shadow-2xl p-6">
                <h2 className="text-xl font-semibold mb-2">Finnhub API Key <span className="text-sm text-gray-400">(Live Prices)</span></h2>
                <div className="mb-4">
                    <label htmlFor="finnhubApiKey" className="block text-sm font-medium mb-1">API Key</label>
                    <div className="relative"><input id="finnhubApiKey" type={showFinnhubKey ? 'text' : 'password'} value={inputFinnhubKey} onChange={(e) => setInputFinnhubKey(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md pl-3 pr-10 py-2" />
                        <button onClick={() => setShowFinnhubKey(!showFinnhubKey)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white" aria-label={showFinnhubKey ? "Hide key" : "Show key"}>
                        {showFinnhubKey ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.477 3 10 3a9.958 9.958 0 00-4.512 1.074L3.707 2.293zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /><path d="M10 17a9.953 9.953 0 01-4.522-1.074l-1.473 1.473a1 1 0 11-1.414-1.414l14-14a1 1 0 111.414 1.414l-1.473 1.473A10.014 10.014 0 01.458 10C1.732 14.057 5.523 17 10 17z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.523 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>}
                        </button>
                    </div>
                </div>
                <div className="text-xs text-gray-500 mb-6">Current: <span className="font-mono text-gray-400">{maskApiKey(finnhubApiKey)}</span></div>
                <div className="flex flex-wrap items-center justify-between">
                    <div className="flex items-center space-x-2 mb-4 md:mb-0">
                        <button onClick={handleSaveFinnhub} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 font-semibold">Save</button>
                        <button onClick={handleTestFinnhub} disabled={isTestingFinnhub} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center">{isTestingFinnhub && <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}{isTestingFinnhub ? 'Testing...' : 'Test'}</button>
                        <button onClick={handleDeleteFinnhub} className="px-4 py-2 rounded-md bg-red-800 hover:bg-red-700 text-red-100">Delete</button>
                    </div>
                    <div className="text-xs text-gray-500">Last Updated: <span className="font-mono text-gray-400">{lastUpdatedFinnhub ? formatToUserTimezone(lastUpdatedFinnhub) : 'N/A'}</span></div>
                </div>
                {feedbackFinnhub && <div className={`mt-6 p-3 rounded-md text-sm ${feedbackFinnhub.type === 'success' ? 'bg-green-900/70 text-green-200' : feedbackFinnhub.type === 'error' ? 'bg-red-900/70 text-red-200' : 'bg-blue-900/70 text-blue-200'}`}>{feedbackFinnhub.message}</div>}
            </div>
             <div className="bg-[#111827] rounded-lg shadow-2xl p-6">
                <h2 className="text-xl font-semibold mb-2">Polygon.io API Key <span className="text-sm text-gray-400">(Performance Chart)</span></h2>
                <div className="mb-4">
                    <label htmlFor="polygonApiKey" className="block text-sm font-medium mb-1">API Key</label>
                    <div className="relative"><input id="polygonApiKey" type={showPolygonKey ? 'text' : 'password'} value={inputPolygonKey} onChange={(e) => setInputPolygonKey(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md pl-3 pr-10 py-2" />
                        <button onClick={() => setShowPolygonKey(!showPolygonKey)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white" aria-label={showPolygonKey ? "Hide key" : "Show key"}>
                            {showPolygonKey ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.477 3 10 3a9.958 9.958 0 00-4.512 1.074L3.707 2.293zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /><path d="M10 17a9.953 9.953 0 01-4.522-1.074l-1.473 1.473a1 1 0 11-1.414-1.414l14-14a1 1 0 111.414 1.414l-1.473 1.473A10.014 10.014 0 01.458 10C1.732 14.057 5.523 17 10 17z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.523 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>}
                        </button>
                    </div>
                </div>
                <div className="text-xs text-gray-500 mb-6">Current: <span className="font-mono text-gray-400">{maskApiKey(polygonApiKey)}</span></div>
                <div className="flex flex-wrap items-center justify-between">
                    <div className="flex items-center space-x-2 mb-4 md:mb-0">
                        <button onClick={handleSavePolygon} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 font-semibold">Save</button>
                        <button onClick={handleTestPolygon} disabled={isTestingPolygon} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center">{isTestingPolygon && <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}{isTestingPolygon ? 'Testing...' : 'Test'}</button>
                        <button onClick={handleDeletePolygon} className="px-4 py-2 rounded-md bg-red-800 hover:bg-red-700 text-red-100">Delete</button>
                    </div>
                    <div className="text-xs text-gray-500">Last Updated: <span className="font-mono text-gray-400">{lastUpdatedPolygon ? formatToUserTimezone(lastUpdatedPolygon) : 'N/A'}</span></div>
                </div>
                {feedbackPolygon && <div className={`mt-6 p-3 rounded-md text-sm ${feedbackPolygon.type === 'success' ? 'bg-green-900/70 text-green-200' : feedbackPolygon.type === 'error' ? 'bg-red-900/70 text-red-200' : 'bg-blue-900/70 text-blue-200'}`}>{feedbackPolygon.message}</div>}
            </div>
        </div>

        {/* Right Column: Local Data Management */}
        <div className="space-y-6">
            <div className="bg-[#111827] rounded-lg shadow-2xl p-6">
              <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                <div>
                    <h2 className="text-xl font-semibold">Automatic Cloud Backups</h2>
                    <p className="text-sm text-gray-400 mt-1">The system automatically keeps the last 10 versions of your data.</p>
                </div>
                 <button onClick={handleManualBackup} disabled={isBackingUp} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {isBackingUp ? (
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4.002 4.002 0 017.739 0A3.5 3.5 0 0114.5 13H11V9.5a1 1 0 10-2 0V13H5.5z" /><path d="M9 13H5.5a3.5 3.5 0 010-7h.09A5.996 5.996 0 0110 2a5.996 5.996 0 015.91 4.01H16a3.5 3.5 0 010 7H11V9.5a1 1 0 10-2 0V13z" /></svg>
                    )}
                    <span>{isBackingUp ? 'Creating...' : 'Create Manual Backup'}</span>
                </button>
              </div>
              <div className="space-y-4">
                  {isFetchingCloud ? (
                      <div className="text-center py-8 text-gray-500">Loading cloud backups...</div>
                  ) : cloudBackups.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No cloud backups found. Create a manual backup or make a transaction to start.</div>
                  ) : (
                      cloudBackups.map(backup => (
                          <div key={backup.id} className="bg-gray-800/50 p-4 rounded-lg flex flex-wrap justify-between items-center gap-4">
                              <div>
                                  <p className="font-semibold text-white">{backup.metadata.summary}</p>
                                  <p className="text-xs text-gray-400">
                                      {formatToUserTimezone(backup.created_at)} • {backup.metadata.portfolioCount} portfolios, {backup.metadata.transactionCount} transactions
                                  </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                  <button onClick={() => handleRestore(backup)} className="px-3 py-1 text-xs rounded-md bg-green-600 hover:bg-green-500">Restore</button>
                                  <button onClick={() => handleExport(backup)} className="px-3 py-1 text-xs rounded-md bg-blue-600 hover:bg-blue-500">Export</button>
                                  <button onClick={() => handleDelete(backup)} className="px-3 py-1 text-xs rounded-md bg-red-800 hover:bg-red-700">Delete</button>
                              </div>
                          </div>
                      ))
                  )}
              </div>
            </div>

            <div className="bg-[#111827] rounded-lg shadow-2xl p-6">
                <h3 className="text-lg font-semibold mb-2">Create Local Backup</h3>
                <p className="text-gray-400 text-sm mb-4">Export all portfolio and transaction data to a single JSON file for safekeeping.</p>
                <button onClick={manager.exportLocalBackup} disabled={isExportingLocal} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50">
                    {isExportingLocal ? 'Exporting...' : 'Export Full Backup'}
                </button>
            </div>
             <div className="bg-[#111827] rounded-lg shadow-2xl p-6">
                <h3 className="text-lg font-semibold mb-2">Restore from Local File</h3>
                <p className="text-gray-400 text-sm mb-4">Choose a restore method and select your JSON backup file.</p>
                {lastError && <div className="bg-red-900/50 text-red-200 p-3 rounded-md mb-4 text-sm"><strong>Error:</strong> {typeof lastError === 'string' ? lastError : 'An unexpected error occurred.'}</div>}
                
                <div className="space-y-4">
                    <fieldset className="flex gap-6">
                        <div className="flex items-center">
                            <input id="full_restore" name="restore_mode" type="radio" checked={restoreMode === 'full'} onChange={() => setRestoreMode('full')} className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"/>
                            <label htmlFor="full_restore" className="ml-3 block text-sm font-medium text-gray-300">
                                Full Restore <span className="text-xs text-red-400">(Overwrites all data)</span>
                            </label>
                        </div>
                        <div className="flex items-center">
                            <input id="merge_restore" name="restore_mode" type="radio" checked={restoreMode === 'merge'} onChange={() => setRestoreMode('merge')} className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"/>
                            <label htmlFor="merge_restore" className="ml-3 block text-sm font-medium text-gray-300">
                                Merge/Replace Portfolio
                            </label>
                        </div>
                    </fieldset>

                    {restoreMode === 'merge' && (
                        <div>
                            <label htmlFor="target_portfolio" className="block text-sm font-medium text-gray-300 mb-1">Target Portfolio</label>
                            <select id="target_portfolio" value={targetPortfolioId} onChange={(e) => setTargetPortfolioId(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2">
                                {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    )}

                    <input ref={fileInputRef} type="file" id="import-file-input" accept=".json" className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-900/50 file:text-blue-300 hover:file:bg-blue-800/50" onChange={handleFileSelect} />
                
                    <button onClick={handleRestoreClick} disabled={isImportingLocal || !selectedFile} className="w-full px-4 py-2 rounded-md bg-yellow-600 hover:bg-yellow-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                        {isImportingLocal ? 'Restoring...' : `Restore from ${selectedFile ? selectedFile.name : '...'}`}
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingPage;