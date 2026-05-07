import { useEffect, useState, useCallback } from 'react';

export function useBatches(search?: string, includeArchived?: boolean) {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBatches = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (includeArchived) params.set('includeArchived', 'true');
      const res = await fetch(getApiUrl(`/api/batches?${params}`));
      const data = await res.json();
      setBatches(data);
    } catch (err) {
      console.error('Failed to fetch batches:', err);
    } finally {
      setLoading(false);
    }
  }, [search, includeArchived]);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  return { batches, loading, refresh: fetchBatches };
}

export function useBatchStudents(batchId?: string | number) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStudents = useCallback(async () => {
    if (!batchId) return;
    try {
      const res = await fetch(getApiUrl(`/api/batches/${batchId}/students`));
      setStudents(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [batchId]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);
  return { students, loading, refresh: fetchStudents };
}

export function useBatchSessions(batchId?: string | number) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!batchId) return;
    try {
      const res = await fetch(getApiUrl(`/api/batches/${batchId}/sessions`));
      setSessions(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [batchId]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);
  return { sessions, loading, refresh: fetchSessions };
}

export function useUpcomingSessions(count: number = 5) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(getApiUrl('/api/sessions/upcoming')).then(r => r.json()).then(d => setSessions(d.slice(0, count))).catch(console.error).finally(() => setLoading(false));
  }, [count]);

  return { sessions, loading };
}

export function useDashboardAlerts() {
  const [alerts, setAlerts] = useState<any>({ lowAttendanceStudents: [], todaySessions: [], nearingCompletion: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(getApiUrl('/api/dashboard/alerts')).then(r => r.json()).then(setAlerts).catch(console.error).finally(() => setLoading(false));
  }, []);

  return { alerts, loading };
}

export function useDashboardTrends() {
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(getApiUrl('/api/dashboard/trends')).then(r => r.json()).then(setTrends).catch(console.error).finally(() => setLoading(false));
  }, []);

  return { trends, loading };
}

export function useAuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    fetch(getApiUrl('/api/audit-log')).then(r => r.json()).then(setLogs).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { logs, loading, refresh };
}

export function useUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    fetch(getApiUrl('/api/users')).then(r => r.json()).then(setUsers).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { users, loading, refresh };
}
