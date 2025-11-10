import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// Vi bruker eksisterende deklarasjon fra window.electron i stedet for å opprette en ny
// declare global {
//   interface Window {
//     electron: {
//       getLogs: () => Promise<{ success: boolean; logs?: string; path?: string; error?: string }>;
//       // ... other electron methods
//     };
//   }
// }

const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<string>('');
  const [logPath, setLogPath] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState<string>('');
  const [sendError, setSendError] = useState<string>('');
  const [isSending, setIsSending] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const result = await window.electron.getLogs();
      if (result.success && result.logs) {
        setLogs(result.logs);
        if (result.path) {
          setLogPath(result.path);
        }
      } else {
        toast.error(`Kunne ikke hente logger: ${result.error || 'Ukjent feil'}`);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Feil under henting av logger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const copyLogsToClipboard = () => {
    try {
      navigator.clipboard.writeText(logs);
      toast.success('Logger kopiert til utklippstavlen');
    } catch (error) {
      console.error('Failed to copy logs:', error);
      toast.error('Kunne ikke kopiere logger');
    }
  };

  const downloadLogs = () => {
    try {
      const blob = new Blob([logs], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'supplier-reminder-logs.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Logger lastet ned');
    } catch (error) {
      console.error('Failed to download logs:', error);
      toast.error('Kunne ikke laste ned logger');
    }
  };

  const handleSendLogs = async () => {
    setIsSending(true);
    setSendStatus('');
    setSendError('');
    try {
      if (!window.electron || !window.electron.sendLogsToSupport) {
        setSendError('Denne funksjonen er ikke tilgjengelig i denne versjonen av appen.');
        toast.error('Kan ikke sende logger: Mangler backend-funksjon.');
        return;
      }
      const result = await window.electron.sendLogsToSupport();
      if (result.success) {
        setSendStatus('Logger åpnet i e-postklient.');
        toast.success('Logger åpnet i e-postklient. Klikk send for å sende til support.');
      } else {
        setSendError(result.error || 'Ukjent feil ved sending av logger.');
        toast.error(result.error || 'Kunne ikke sende logger.');
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Ukjent feil');
      toast.error(
        'Kunne ikke sende logger: ' + (err instanceof Error ? err.message : 'Ukjent feil')
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Loggvisning</h2>
        <div className="flex space-x-2">
          <button
            onClick={fetchLogs}
            className="px-3 py-1 bg-neutral text-white rounded hover:bg-neutral-dark disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Laster...' : 'Oppdater'}
          </button>
          <button
            onClick={copyLogsToClipboard}
            className="px-3 py-1 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
            disabled={isLoading || !logs}
          >
            Kopier
          </button>
          <button
            onClick={downloadLogs}
            className="px-3 py-1 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
            disabled={isLoading || !logs}
          >
            Last ned
          </button>
          <button
            onClick={handleSendLogs}
            className="px-3 py-1 bg-accent text-white rounded hover:bg-accent-dark disabled:opacity-50"
            disabled={isLoading || !logs || isSending}
            title="Åpner Outlook med logger vedlagt. Fungerer kun med Outlook Desktop på Windows."
          >
            {isSending ? 'Sender...' : 'Send til support'}
          </button>
        </div>
      </div>

      {logPath && (
        <div className="mb-4 p-2 bg-neutral-light rounded text-sm">
          <span>Loggfil: {logPath}</span>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      ) : logs ? (
        <pre className="bg-gray-100 p-4 rounded-md text-sm h-96 overflow-auto font-mono whitespace-pre-wrap">
          {logs}
        </pre>
      ) : (
        <div className="text-center p-8 bg-gray-100 rounded-md">
          <p>Ingen logger tilgjengelig</p>
        </div>
      )}

      {sendStatus && <div className="mt-2 text-green-700">{sendStatus}</div>}
      {sendError && <div className="mt-2 text-red-700">{sendError}</div>}
    </div>
  );
};

export default LogViewer;
