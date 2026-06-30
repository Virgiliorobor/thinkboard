import { useState } from 'react';
import { api, ApiError } from '../lib/api';

export function useRefetchMetadata(slug: string | undefined, onComplete?: () => void) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refetchAll = async () => {
    if (!slug) return;
    if (
      !window.confirm(
        'Fetch titles, images, and article text from source URLs? This may take a few minutes for large researches.'
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    let totalRefetched = 0;
    let remaining = 1;

    try {
      while (remaining > 0) {
        setStatus(`Fetching metadata… ${totalRefetched} done so far`);
        const result = await api.refetchMetadata(slug, { missingOnly: true, limit: 15 });
        totalRefetched += result.refetched;
        remaining = result.remaining;
        if (result.total === 0) break;
      }
      setStatus(`Done — updated ${totalRefetched} entries.`);
      onComplete?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Metadata fetch failed');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  return { refetchAll, loading, status, error, clearStatus: () => setStatus(null) };
}
