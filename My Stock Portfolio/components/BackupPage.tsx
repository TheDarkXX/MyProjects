import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Portfolio, Transaction, CloudBackup, AppCheckpoint } from '../types';
import { formatToUserTimezone } from '../lib/logging';
import { logActivity } from '../lib/activityLogger';

interface BackupPageProps {
  setNotification: (message: string, type: 'success' | 'error') => void;
  portfolios: Portfolio[];
}

// --- Helper Functions ---
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onabort = () => reject(new Error("File reading was aborted"));
    reader.readAsText(file);
  });
};

// --- Confirmation Modal Component ---
export const ConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    confirmColor?: string;
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", confirmColor = "bg-red-600 hover:bg-red-500" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl text-white w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">{title}</h2>
                <div className="mb-6 text-gray-300">{message}</div>
                <div className="flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500">Cancel</button>
                    <button onClick={onConfirm} className={`px-4 py-2 rounded-md ${confirmColor}`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

// --- Main Hook for All Backup/Restore Logic ---
export const useBackupAndRestore = ({ setNotification, portfolios }: BackupPageProps) => {
  const [states, setStates] = useState({
    // Local state
    isExportingLocal: false,
    isImportingLocal: false,
    // Cloud state
    isFetchingCloud: true,
    isRestoringCloud: false,
    isDeletingCloud: false,
    // App Checkpoint state
    isFetchingAppCheckpoints: true,
    isDeletingAppCheckpoint: false,
    // Shared state
    cloudBackups: [] as CloudBackup[],
    activityLog: [] as any[],
    appCheckpoints: [] as AppCheckpoint[],
    lastError: null as string | null,
    // Modal state
    showRestoreConfirm: false,
    showDeleteConfirm: false,
    backupInModal: null as CloudBackup | null,
    showAppCheckpointRestore: false,
    showAppCheckpointDelete: false,
    appCheckpointInModal: null as AppCheckpoint | null,
    showMergeConfirm: false,
    mergeFile: null as File | null,
    mergeTargetPortfolioId: null as string | null,
  });

  const updateState = (newState: Partial<typeof states>) => setStates(prev => ({ ...prev, ...newState }));

  // --- Activity Log Logic ---
  const loadActivityLog = useCallback(async () => {
    const { data, error } = await supabase.from('restore_checkpoints').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) console.warn("⚠️ Failed to load activity log:", error);
    else updateState({ activityLog: data || [] });
  }, []);

  // --- App Checkpoint Logic ---
  const fetchAppCheckpoints = useCallback(async () => {
      updateState({ isFetchingAppCheckpoints: true });
      const { data, error } = await supabase.from('app_checkpoints').select('*').order('created_at', { ascending: false }).limit(10);
      if (error) {
          setNotification(`Failed to fetch app checkpoints: ${error.message}`, 'error');
      } else {
          updateState({ appCheckpoints: (data as AppCheckpoint[]) || [] });
      }
      updateState({ isFetchingAppCheckpoints: false });
  }, [setNotification]);

  const deleteAppCheckpoint = async () => {
    if (!states.appCheckpointInModal) return;
    updateState({ isDeletingAppCheckpoint: true });
    try {
        const { error } = await supabase.from('app_checkpoints').delete().eq('id', states.appCheckpointInModal.id);
        if (error) throw error;
        setNotification('App checkpoint deleted.', 'success');
        await logActivity('app_checkpoint_delete', { summary: states.appCheckpointInModal.version_summary });
        fetchAppCheckpoints();
    } catch (error) {
        const err = error as Error;
        setNotification(`Failed to delete app checkpoint: ${err.message}`, 'error');
    } finally {
        updateState({ isDeletingAppCheckpoint: false, showAppCheckpointDelete: false, appCheckpointInModal: null });
    }
  };

  const exportAppCheckpoint = (checkpoint: AppCheckpoint) => {
    const fileName = `InvestTrack_AppCheckpoint_${formatToUserTimezone(checkpoint.created_at).replace(/ /g, '_').replace(/:/g, '-')}.json`;
    const fileContent = JSON.stringify(checkpoint.app_files, null, 2);
    const blob = new Blob([fileContent], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setNotification(`Exported ${fileName}`, 'success');
  };


  // --- Cloud Backup Logic ---
  const fetchCloudBackups = useCallback(async () => {
      updateState({ isFetchingCloud: true });
      const { data, error } = await supabase.from('cloud_backups').select('*').order('created_at', { ascending: false }).limit(10);
      if (error) {
          console.error("Cloud backup fetch failed:", error);
          setNotification(`Could not load cloud backups: ${error.message}. This may be due to database permissions (RLS).`, 'error');
          updateState({ lastError: error.message, cloudBackups: [] }); // Explicitly set to empty array on error
      } else {
          updateState({ cloudBackups: (data as CloudBackup[]) || [] });
      }
      updateState({ isFetchingCloud: false });
  }, [setNotification]);
  
  const restoreFromCloud = async () => {
      if (!states.backupInModal) return;
      updateState({ isRestoringCloud: true });
      try {
          const { backup_data, id, metadata } = states.backupInModal;
          await logActivity('restore_cloud_start', { restored_from_id: id, summary: metadata.summary });
          await executeDataImport({ data: backup_data });
          await logActivity('restore_cloud_success', { restored_from_id: id });
          setNotification('Restore from cloud complete! App is refreshing...', 'success');
          setTimeout(() => window.dispatchEvent(new Event('refetchData')), 1000);
      } catch (error) {
          const err = error as Error;
          if (states.backupInModal) {
            await logActivity('restore_cloud_fail', { restored_from_id: states.backupInModal.id, error_message: err.message });
          }
          setNotification(`Cloud restore failed: ${err.message}`, 'error');
      } finally {
          updateState({ isRestoringCloud: false, showRestoreConfirm: false, backupInModal: null });
      }
  };

  const deleteCloudBackup = async () => {
    if (!states.backupInModal) return;
    updateState({ isDeletingCloud: true });
    try {
        const { error } = await supabase.from('cloud_backups').delete().eq('id', states.backupInModal.id);
        if (error) throw error;
        setNotification('Cloud backup deleted.', 'success');
        await logActivity('cloud_backup_delete', { deleted_id: states.backupInModal.id, summary: states.backupInModal.metadata.summary });
        fetchCloudBackups(); // Refresh list
    } catch (error) {
        const err = error as Error;
        setNotification(`Failed to delete cloud backup: ${err.message}`, 'error');
    } finally {
        updateState({ isDeletingCloud: false, showDeleteConfirm: false, backupInModal: null });
    }
  };

  const exportFromCloud = (backup: CloudBackup) => {
    const fileName = `InvestTrack_CloudBackup_${formatToUserTimezone(backup.created_at).replace(/ /g, '_').replace(/:/g, '-')}.json`;
    const fileContent = JSON.stringify(backup.backup_data, null, 2);
    const blob = new Blob([fileContent], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setNotification(`Exported ${fileName}`, 'success');
  };
  
  useEffect(() => { loadActivityLog(); fetchCloudBackups(); fetchAppCheckpoints(); }, [loadActivityLog, fetchCloudBackups, fetchAppCheckpoints]);

  // --- Local Backup Logic ---
  const executeDataImport = async (backupData: { data: { portfolios: any[], transactions: any[] } }) => {
    const oldToNewPortfolioIdMap = new Map<string, string>();
    const portfoliosToInsert = backupData.data.portfolios.map(({ id, data, cash, total, ...p }) => p);

    await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('portfolios').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    const { data: newPortfolios, error: pError } = await supabase.from('portfolios').insert(portfoliosToInsert).select();
    if (pError) throw new Error(`Failed to insert portfolios: ${pError.message}`);
    
    if (newPortfolios) {
      backupData.data.portfolios.forEach(oldPortfolio => {
          const newPortfolio = newPortfolios.find(p => p.name === oldPortfolio.name);
          if (newPortfolio) oldToNewPortfolioIdMap.set(oldPortfolio.id, newPortfolio.id);
      });
    }

    const transactionsToInsert = backupData.data.transactions
        .map(({ id, ...t }: any) => {
            const oldId = t.portfolioId || t.portfolio_id;
            const newPortfolioId = oldToNewPortfolioIdMap.get(oldId);
            const newT = { ...t, portfolio_id: newPortfolioId || '' };
            delete newT.portfolioId; // Clean up old key if it exists
            return newT;
        })
        .filter(t => t.portfolio_id);
    
    if(transactionsToInsert.length > 0) {
      const { error: tError } = await supabase.from('transactions').insert(transactionsToInsert);
      if (tError) throw new Error(`Failed to insert transactions: ${tError.message}`);
    }
  };

  const importLocalBackup = async (file: File) => {
    updateState({ isImportingLocal: true, lastError: null });
    try {
        if (!file || !file.name.endsWith('.json')) throw new Error("Please select a valid JSON backup file");
        const fileContent = await readFileAsText(file);
        const backupData = JSON.parse(fileContent);
        
        await logActivity('import_local_start', { file_name: file.name, backup_metadata: backupData.metadata });
        await executeDataImport(backupData);
        await logActivity('import_local_success', { file_name: file.name, imported_counts: backupData.metadata?.summary });
        
        setNotification('Import complete! App is refreshing...', 'success');
        window.dispatchEvent(new CustomEvent('triggerAutoBackup', { detail: { summary: `Restored from local backup: ${file.name}` } }));
        setTimeout(() => window.dispatchEvent(new Event('refetchData')), 1000);
    } catch (error) {
        const err = error as Error;
        await logActivity('import_local_fail', { error_message: err.message, import_file: file?.name });
        setNotification(`Import failed: ${err.message}`, 'error');
        updateState({ lastError: err.message });
    } finally {
        updateState({ isImportingLocal: false });
    }
  };

  const mergeImportLocalBackup = async () => {
    if (!states.mergeFile || !states.mergeTargetPortfolioId) return;

    updateState({ isImportingLocal: true, lastError: null });
    try {
      const { mergeFile: file, mergeTargetPortfolioId: targetPortfolioId } = states;
      const fileContent = await readFileAsText(file);
      const backupData = JSON.parse(fileContent);

      if (!backupData.data || !backupData.data.portfolios || !backupData.data.transactions) {
        throw new Error("Invalid backup file format. Missing 'data.portfolios' or 'data.transactions'.");
      }

      const targetPortfolio = portfolios.find(p => p.id === targetPortfolioId);
      if (!targetPortfolio) throw new Error("Target portfolio not found in current data.");

      const sourcePortfolioInBackup = backupData.data.portfolios.find((p: any) => p.name === targetPortfolio.name);
      if (!sourcePortfolioInBackup) throw new Error(`Portfolio named "${targetPortfolio.name}" not found in backup file.`);
      
      const sourcePortfolioId = sourcePortfolioInBackup.id;

      const transactionsToInsert = backupData.data.transactions
        .filter((t: any) => (t.portfolioId || t.portfolio_id) === sourcePortfolioId)
        .map(({ id, ...t }: any) => {
            const newT = { ...t, portfolio_id: targetPortfolioId };
            delete newT.portfolioId;
            return newT;
        });

      await logActivity('merge_local_start', { target_portfolio: targetPortfolio.name, file: file.name });
      
      const { error: deleteError } = await supabase.from('transactions').delete().eq('portfolio_id', targetPortfolioId);
      if (deleteError) throw new Error(`Failed to delete old transactions: ${deleteError.message}`);

      if (transactionsToInsert.length > 0) {
        const { error: insertError } = await supabase.from('transactions').insert(transactionsToInsert);
        if (insertError) throw new Error(`Failed to insert new transactions: ${insertError.message}`);
      }

      await logActivity('merge_local_success', { target_portfolio: targetPortfolio.name, inserted_count: transactionsToInsert.length });

      setNotification(`Successfully replaced transactions for ${targetPortfolio.name}! App is refreshing...`, 'success');
      window.dispatchEvent(new CustomEvent('triggerAutoBackup', { detail: { summary: `Merged backup to ${targetPortfolio.name}` } }));
      setTimeout(() => window.dispatchEvent(new Event('refetchData')), 1000);

    } catch (error) {
      const err = error as Error;
      await logActivity('merge_local_fail', { error_message: err.message });
      setNotification(`Merge failed: ${err.message}`, 'error');
      updateState({ lastError: err.message });
    } finally {
      updateState({ isImportingLocal: false, showMergeConfirm: false, mergeFile: null, mergeTargetPortfolioId: null });
    }
  };


  const exportLocalBackup = async () => {
    updateState({ isExportingLocal: true, lastError: null });
    try {
        const { data: portfoliosData } = await supabase.from('portfolios').select('*');
        const { data: transactionsData } = await supabase.from('transactions').select('*');
        const backupPayload = {
            metadata: { app_name: "InvestTrack AI", created_at: new Date().toISOString(), summary: { portfolios: portfoliosData?.length, transactions: transactionsData?.length } },
            data: { portfolios: portfoliosData, transactions: transactionsData }
        };
        const now = new Date();
        const timestamp = now.toISOString().replace(/:/g, '-').replace(/\..+/, '').replace('T', '_');
        const fileName = `InvestTrack_Backup_${timestamp}.json`;
        const jsonString = JSON.stringify(backupPayload, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        await logActivity('export_local_success', { file_name: fileName });
        setNotification(`Backup "${fileName}" created successfully.`, 'success');
    } catch (error) {
        const err = error as Error;
        setNotification(`Export failed: ${err.message}`, 'error');
        updateState({ lastError: err.message });
    } finally {
        updateState({ isExportingLocal: false });
    }
  };
  
  return { 
    ...states, 
    exportLocalBackup,
    importLocalBackup,
    handleMerge: (file: File, targetPortfolioId: string) => updateState({ showMergeConfirm: true, mergeFile: file, mergeTargetPortfolioId: targetPortfolioId }),
    confirmMerge: mergeImportLocalBackup,
    fetchCloudBackups,
    handleRestore: (b: CloudBackup) => updateState({ showRestoreConfirm: true, backupInModal: b }),
    handleExport: (b: CloudBackup) => exportFromCloud(b),
    handleDelete: (b: CloudBackup) => updateState({ showDeleteConfirm: true, backupInModal: b }),
    confirmRestore: restoreFromCloud,
    confirmDelete: deleteCloudBackup,
    closeModals: () => updateState({ showRestoreConfirm: false, showDeleteConfirm: false, backupInModal: null, showAppCheckpointRestore: false, showAppCheckpointDelete: false, appCheckpointInModal: null, showMergeConfirm: false }),
    handleAppCheckpointRestore: (c: AppCheckpoint) => updateState({ showAppCheckpointRestore: true, appCheckpointInModal: c }),
    handleAppCheckpointExport: (c: AppCheckpoint) => exportAppCheckpoint(c),
    handleAppCheckpointDelete: (c: AppCheckpoint) => updateState({ showAppCheckpointDelete: true, appCheckpointInModal: c }),
    confirmAppCheckpointDelete: deleteAppCheckpoint,
  };
};

// --- UI Components ---
const CloudBackupTab: React.FC<{ manager: ReturnType<typeof useBackupAndRestore> }> = ({ manager }) => {
    const { cloudBackups, isFetchingCloud, handleRestore, handleExport, handleDelete } = manager;

    if (isFetchingCloud) {
        return <div className="text-center py-10">Loading cloud backups...</div>;
    }

    return (
        <div className="bg-[#111827] rounded-lg shadow-2xl p-6">
            <h2 className="text-xl font-semibold mb-2">Automatic Cloud Backups</h2>
            <p className="text-sm text-gray-400 mb-4">The system automatically keeps the last 10 versions of your portfolio. You can restore, export, or delete any version.</p>
            <div className="space-y-4">
                {cloudBackups.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No cloud backups found. This may be due to a new database or incorrect read permissions (RLS).</div>
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
    );
};

const AppCheckpointsTab: React.FC<{ manager: ReturnType<typeof useBackupAndRestore> }> = ({ manager }) => {
    const { appCheckpoints, isFetchingAppCheckpoints, handleAppCheckpointRestore, handleAppCheckpointExport, handleAppCheckpointDelete } = manager;

    if (isFetchingAppCheckpoints) {
        return <div className="text-center py-10">Loading application checkpoints...</div>;
    }

    return (
        <div className="bg-[#111827] rounded-lg shadow-2xl p-6">
            <h2 className="text-xl font-semibold mb-2">Application Code Checkpoints</h2>
            <p className="text-sm text-gray-400 mb-4">A history of the last 10 application code updates. You can view, export, or ask the AI to restore a previous version.</p>
            <div className="space-y-4">
                {appCheckpoints.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No application checkpoints found.</div>
                ) : (
                    appCheckpoints.map(checkpoint => (
                        <div key={checkpoint.id} className="bg-gray-800/50 p-4 rounded-lg flex flex-wrap justify-between items-center gap-4">
                            <div>
                                <p className="font-semibold text-white">{checkpoint.version_summary}</p>
                                <p className="text-xs text-gray-400">
                                    {formatToUserTimezone(checkpoint.created_at)} • {checkpoint.file_count} files, {checkpoint.total_size_kb} KB
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => handleAppCheckpointRestore(checkpoint)} className="px-3 py-1 text-xs rounded-md bg-green-600 hover:bg-green-500">Restore</button>
                                <button onClick={() => handleAppCheckpointExport(checkpoint)} className="px-3 py-1 text-xs rounded-md bg-blue-600 hover:bg-blue-500">Export</button>
                                <button onClick={() => handleAppCheckpointDelete(checkpoint)} className="px-3 py-1 text-xs rounded-md bg-red-800 hover:bg-red-700">Delete</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const ActivityLogTab: React.FC<{ log: any[] }> = ({ log }) => {
    return (
        <div className="bg-[#111827] rounded-lg shadow-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">Data Activity Log</h2>
            <p className="text-sm text-gray-400 mb-4">A detailed audit trail of all data backup and restore actions.</p>
            <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-[#1A2233] sticky top-0">
                        <tr>
                            <th className="px-4 py-3">Timestamp</th>
                            <th className="px-4 py-3">Action Type</th>
                            <th className="px-4 py-3">Metadata</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {log.map(item => (
                            <tr key={item.id} className="hover:bg-gray-800/50">
                                <td className="px-4 py-3 whitespace-nowrap">{formatToUserTimezone(item.created_at)}</td>
                                <td className="px-4 py-3 font-mono text-xs">{item.action_type}</td>
                                <td className="px-4 py-3 font-mono text-xs"><pre className="whitespace-pre-wrap max-w-lg">{JSON.stringify(item.metadata, null, 2)}</pre></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AppCheckpointRestoreModal: React.FC<{ checkpoint: AppCheckpoint | null, onClose: () => void, setNotification: (message: string, type: 'success' | 'error') => void }> = ({ checkpoint, onClose, setNotification }) => {
    if (!checkpoint) return null;

    const copyToClipboard = async () => {
        try {
            const codeString = JSON.stringify(checkpoint.app_files, null, 2);
            await navigator.clipboard.writeText(codeString);
            setNotification('Code copied to clipboard!', 'success');
        } catch (err) {
            setNotification('Failed to copy code.', 'error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl text-white w-full max-w-4xl h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Restore App Checkpoint</h2>
                    <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500">Close</button>
                </div>
                <div className="bg-yellow-900/50 text-yellow-200 p-3 rounded-md mb-4 text-sm">
                    <strong>Instructions:</strong> To restore this version, click "Copy All Code" and paste the content into your next prompt to the AI.
                </div>
                <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                    {Object.entries(checkpoint.app_files).map(([path, content]) => (
                        <div key={path}>
                            <h3 className="font-mono text-sm text-cyan-400 bg-gray-900 p-2 rounded-t-md">{path}</h3>
                            <pre className="bg-gray-900/50 p-4 rounded-b-md text-xs whitespace-pre-wrap">{content}</pre>
                        </div>
                    ))}
                </div>
                <div className="mt-4 flex justify-end">
                    <button onClick={copyToClipboard} className="px-6 py-2 rounded-md bg-blue-600 hover:bg-blue-500 font-semibold">Copy All Code</button>
                </div>
            </div>
        </div>
    );
};


const BackupPage: React.FC<BackupPageProps> = ({ setNotification, portfolios }) => {
  const manager = useBackupAndRestore({ setNotification, portfolios });
  const [activeTab, setActiveTab] = useState('Cloud Backups');
  const TABS = ['Cloud Backups', 'App Checkpoints', 'Data Activity Log'];
  const targetPortfolioForMerge = portfolios.find(p => p.id === manager.mergeTargetPortfolioId);

  return (
    <div className="container mx-auto p-4 md:p-6 text-white space-y-6">
        <ConfirmationModal 
            isOpen={manager.showRestoreConfirm}
            onClose={manager.closeModals}
            onConfirm={manager.confirmRestore}
            title="Confirm Full Data Restore"
            message={<>Are you sure you want to restore this backup? This will <strong className="text-red-400">permanently overwrite all</strong> of your current portfolio and transaction data.</>}
            confirmText="Yes, Overwrite All Data"
            confirmColor="bg-red-600 hover:bg-red-500"
        />
        <ConfirmationModal 
            isOpen={manager.showMergeConfirm}
            onClose={manager.closeModals}
            onConfirm={manager.confirmMerge}
            title="Confirm Portfolio Merge/Replace"
            message={<>This will delete all existing transactions for the portfolio <strong className="text-yellow-400">"{targetPortfolioForMerge?.name}"</strong> and replace them with transactions from the backup file. This action cannot be undone.</>}
            confirmText="Yes, Replace Transactions"
            confirmColor="bg-yellow-600 hover:bg-yellow-500"
        />
        <ConfirmationModal 
            isOpen={manager.showDeleteConfirm}
            onClose={manager.closeModals}
            onConfirm={manager.confirmDelete}
            title="Confirm Cloud Backup Deletion"
            message="Are you sure you want to delete this cloud backup? This action cannot be undone."
            confirmText="Yes, Delete"
        />
        <ConfirmationModal
            isOpen={manager.showAppCheckpointDelete}
            onClose={manager.closeModals}
            onConfirm={manager.confirmAppCheckpointDelete}
            title="Confirm App Checkpoint Deletion"
            message="Are you sure you want to delete this application code checkpoint? This is permanent."
            confirmText="Yes, Delete Checkpoint"
        />
        <AppCheckpointRestoreModal 
            checkpoint={manager.appCheckpointInModal}
            onClose={manager.closeModals}
            setNotification={setNotification}
        />
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Backup & Restore</h1>
        <p className="text-gray-400 mt-2">Manage automatic cloud backups and application code checkpoints.</p>
      </div>
      
      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`${activeTab === tab ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none`}>
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'Cloud Backups' && <CloudBackupTab manager={manager} />}
      {activeTab === 'App Checkpoints' && <AppCheckpointsTab manager={manager} />}
      {activeTab === 'Data Activity Log' && <ActivityLogTab log={manager.activityLog} />}
    </div>
  );
};

export default BackupPage;