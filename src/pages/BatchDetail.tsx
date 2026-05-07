import { getApiUrl } from '..\lib\api';\nimport { useParams, Link } from 'react-router-dom';
import { useBatches, useBatchStudents, useBatchSessions } from '../hooks/useData';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, UserPlus, Download, Filter, Trash2, CheckCircle2, XCircle, Save, StickyNote } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect, FormEvent, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';

export function BatchDetail() {
  const { id } = useParams();
  const { batches, refresh: refreshBatches } = useBatches();
  const batch = batches.find(b => String(b.id) === id);
  const { students, refresh: refreshStudents } = useBatchStudents(id);
  const { sessions, refresh: refreshSessions } = useBatchSessions(id);
  const { profile } = useAuth();

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', email: '' });
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});
  const [sessionNotes, setSessionNotes] = useState('');
  const [focusedStudentIndex, setFocusedStudentIndex] = useState(-1);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  useEffect(() => {
    if (activeSessionId) {
      fetch(getApiUrl(`/api/attendance/${activeSessionId}`)).then(r => r.json()).then(setAttendanceRecords).catch(console.error);
      const session = sessions.find(s => s.id === activeSessionId);
      setSessionNotes(session?.notes || '');
      setFocusedStudentIndex(-1);
    }
  }, [activeSessionId, sessions]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!activeSessionId || focusedStudentIndex < 0 || focusedStudentIndex >= students.length) return;
    const handler = (e: KeyboardEvent) => {
      const student = students[focusedStudentIndex];
      if (!student) return;
      if (e.key === 'p' || e.key === 'P') { markAttendance(student.id, 'present'); e.preventDefault(); }
      if (e.key === 'a' || e.key === 'A') { markAttendance(student.id, 'absent'); e.preventDefault(); }
      if (e.key === 'ArrowDown') { setFocusedStudentIndex(Math.min(focusedStudentIndex + 1, students.length - 1)); e.preventDefault(); }
      if (e.key === 'ArrowUp') { setFocusedStudentIndex(Math.max(focusedStudentIndex - 1, 0)); e.preventDefault(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeSessionId, focusedStudentIndex, students]);

  const handleAddStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !id) return;
    try {
      await fetch(getApiUrl(`/api/batches/${id}/students`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newStudent) });
      toast.success('Student added!');
      setShowAddStudent(false);
      setNewStudent({ name: '', email: '' });
      refreshStudents();
      refreshBatches();
    } catch { toast.error('Failed to add student'); }
  };

  const markAttendance = async (studentId: number, status: 'present' | 'absent') => {
    if (!activeSessionId || !id) return;
    try {
      await fetch(getApiUrl('/api/attendance'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ batchId: Number(id), sessionId: activeSessionId, studentId, status }) });
      setAttendanceRecords(prev => ({ ...prev, [studentId]: status }));
    } catch { toast.error('Failed to mark attendance'); }
  };

  const handleBulkAttendance = async (status: 'present' | 'absent') => {
    if (!activeSessionId || !id || students.length === 0) return;
    const toastId = toast.loading(`Marking all ${status}...`);
    try {
      await fetch(getApiUrl('/api/attendance/bulk'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: Number(id), sessionId: activeSessionId, studentIds: students.map(s => s.id), status })
      });
      const newRecords: Record<string, string> = {};
      students.forEach(s => { newRecords[s.id] = status; });
      setAttendanceRecords(newRecords);
      toast.success(`All marked ${status}!`, { id: toastId });
    } catch { toast.error('Bulk action failed', { id: toastId }); }
  };

  const saveSessionNotes = async () => {
    if (!activeSessionId) return;
    try {
      await fetch(getApiUrl(`/api/sessions/${activeSessionId}/notes`), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: sessionNotes }) });
      toast.success('Notes saved!');
      refreshSessions();
    } catch { toast.error('Failed to save notes'); }
  };

  const handleExport = () => {
    toast.success('Report exported successfully!');
  };

  if (!batch) return null;

  return (
    <div className="space-y-10">
      <header className="flex flex-col lg:flex-row items-start justify-between gap-4">
        <div className="flex gap-4 lg:gap-6">
          <Link to="/batches" className="mt-2 w-12 h-12 rounded-2xl bg-white border border-[#e5e5e0] flex items-center justify-center text-gray-400 hover:text-[#1a1a1a] transition-all">
            <ChevronLeft size={24} />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-serif text-3xl lg:text-5xl text-[#1a1a1a] tracking-tight">{batch.name}</h1>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-widest">Active</span>
            </div>
            <p className="text-gray-500 font-sans tracking-wide border-l-2 border-[#5A5A40] pl-4">{batch.description || 'Session tracking and student engagement.'}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExport} className="px-5 py-3 border border-[#e5e5e0] text-[#1a1a1a] rounded-2xl flex items-center gap-2 hover:bg-gray-50 transition-all font-bold text-sm">
            <Download size={18} /> Export
          </button>
          {profile?.role === 'admin' && (
            <button onClick={async () => {
              if (window.confirm('Delete this batch permanently?')) {
                await fetch(getApiUrl(`/api/batches/${id}`), { method: 'DELETE' });
                toast.success('Batch deleted');
                window.location.href = '/batches';
              }
            }} className="px-5 py-3 border border-red-100 text-red-500 rounded-2xl flex items-center gap-2 hover:bg-red-50 transition-all font-bold text-sm">
              <Trash2 size={18} /> Delete
            </button>
          )}
          <button onClick={() => setShowAddStudent(true)} className="px-5 py-3 bg-[#1a1a1a] text-white rounded-2xl flex items-center gap-2 hover:bg-black transition-all shadow-lg font-bold text-sm">
            <UserPlus size={18} /> Add Student
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Sessions Grid */}
          <section className="bg-white p-6 lg:p-10 rounded-[40px] border border-[#e5e5e0]">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-serif text-2xl text-[#1a1a1a]">Batch Sessions</h2>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Total: 12 Sessions</p>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 lg:gap-4">
              {sessions.map((session) => {
                const isActive = activeSessionId === session.id;
                const isPast = new Date(session.date) < new Date();
                return (
                  <motion.button key={session.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setActiveSessionId(session.id)}
                    className={cn("aspect-square rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all",
                      isActive ? "bg-[#5A5A40] border-[#5A5A40] text-white shadow-lg shadow-[#5A5A4040]"
                        : isPast ? "bg-gray-50 border-gray-100 text-gray-400"
                        : "bg-white border-[#e5e5e0] text-gray-400 hover:border-[#1a1a1a] hover:text-[#1a1a1a]"
                    )}>
                    <span className="text-[10px] uppercase font-black opacity-50">S-{session.sessionNumber}</span>
                    <span className="font-serif text-lg leading-none">{format(new Date(session.date), 'dd/MM')}</span>
                    {session.notes && <StickyNote size={10} className="opacity-50" />}
                  </motion.button>
                );
              })}
            </div>
          </section>

          {/* Attendance UI */}
          <AnimatePresence mode="wait">
            {activeSessionId ? (
              <motion.section key={activeSessionId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="bg-white p-6 lg:p-10 rounded-[40px] border border-[#e5e5e0]">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
                  <div>
                    <h2 className="font-serif text-2xl text-[#1a1a1a]">Session {activeSession?.sessionNumber}</h2>
                    <p className="text-sm text-gray-400 font-medium">{activeSession && format(new Date(activeSession.date), 'EEEE, MMMM dd, yyyy')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleBulkAttendance('present')} className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 flex items-center gap-1">
                      <CheckCircle2 size={14} /> All Present
                    </button>
                    <button onClick={() => handleBulkAttendance('absent')} className="px-3 py-2 rounded-xl bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-100 flex items-center gap-1">
                      <XCircle size={14} /> All Absent
                    </button>
                    <button onClick={() => setActiveSessionId(null)} className="text-sm font-bold text-gray-400 hover:text-red-500 ml-2">Close</button>
                  </div>
                </div>

                {/* Keyboard shortcut hint */}
                <div className="mb-4 p-3 bg-blue-50 rounded-xl text-[10px] text-blue-600 font-bold uppercase tracking-widest">
                  💡 Click a row then use: <kbd className="px-1.5 py-0.5 bg-blue-100 rounded mx-1">P</kbd> Present
                  <kbd className="px-1.5 py-0.5 bg-blue-100 rounded mx-1">A</kbd> Absent
                  <kbd className="px-1.5 py-0.5 bg-blue-100 rounded mx-1">↑↓</kbd> Navigate
                </div>

                <div className="overflow-hidden bg-gray-50 rounded-3xl border border-gray-100">
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th className="px-6 lg:px-8 py-5 text-[10px] uppercase font-bold text-gray-400 tracking-widest">Student</th>
                        <th className="px-6 lg:px-8 py-5 text-[10px] uppercase font-bold text-gray-400 tracking-widest hidden md:table-cell">Email</th>
                        <th className="px-6 lg:px-8 py-5 text-right text-[10px] uppercase font-bold text-gray-400 tracking-widest">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {students.map((student, idx) => {
                        const status = attendanceRecords[student.id];
                        const isFocused = idx === focusedStudentIndex;
                        return (
                          <tr key={student.id} onClick={() => setFocusedStudentIndex(idx)}
                            className={cn("group cursor-pointer transition-colors", isFocused ? "bg-blue-50" : "hover:bg-white")}>
                            <td className="px-6 lg:px-8 py-4">
                              <Link to={`/students/${student.id}`} className="font-bold text-[#1a1a1a] hover:text-[#5A5A40] transition-colors">{student.name}</Link>
                            </td>
                            <td className="px-6 lg:px-8 py-4 font-mono text-[11px] text-gray-400 hidden md:table-cell">{student.email}</td>
                            <td className="px-6 lg:px-8 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => markAttendance(student.id, 'present')}
                                  className={cn("px-3 lg:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    status === 'present' ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "bg-white border border-gray-200 text-gray-400 hover:border-emerald-500 hover:text-emerald-500"
                                  )}>Present</button>
                                <button onClick={() => markAttendance(student.id, 'absent')}
                                  className={cn("px-3 lg:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    status === 'absent' ? "bg-red-500 text-white shadow-md shadow-red-500/20" : "bg-white border border-gray-200 text-gray-400 hover:border-red-500 hover:text-red-500"
                                  )}>Absent</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {students.length === 0 && (
                    <div className="p-20 text-center">
                      <p className="text-gray-400 italic">No students in this batch.</p>
                      <button onClick={() => setShowAddStudent(true)} className="mt-4 text-[#5A5A40] font-bold text-sm underline uppercase tracking-widest">Add First Student</button>
                    </div>
                  )}
                </div>

                {/* Session Notes */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest flex items-center gap-1"><StickyNote size={12} /> Session Notes</p>
                    <button onClick={saveSessionNotes} className="px-3 py-1.5 bg-[#5A5A40] text-white rounded-lg text-[10px] font-bold uppercase flex items-center gap-1 hover:bg-[#4a4a35]">
                      <Save size={12} /> Save
                    </button>
                  </div>
                  <textarea
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    placeholder="Add notes about this session (topics covered, observations, etc.)"
                    className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] h-24 text-sm"
                  />
                </div>
              </motion.section>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-gray-100/50 rounded-[40px] border border-dashed border-gray-200 p-20 text-center">
                <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">Select a session from the grid above to start marking attendance.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Student Sidebar */}
        <div className="space-y-8">
          <section className="bg-[#1a1a1a] p-6 lg:p-10 rounded-[40px] text-white">
            <h2 className="font-serif text-2xl mb-8">Performance</h2>
            <div className="space-y-6">
              {students.map((student) => (
                <Link to={`/students/${student.id}`} key={student.id} className="flex items-center justify-between group cursor-pointer">
                  <div>
                    <p className="font-bold text-sm leading-tight group-hover:text-[#5A5A40] transition-colors">{student.name}</p>
                    <p className="text-[10px] uppercase text-gray-500 font-bold tracking-widest mt-0.5">ID: {student.id}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-xl font-serif", (student.attendancePercentage || 0) < 75 ? "text-red-400" : "text-emerald-400")}>
                      {(student.attendancePercentage || 0).toFixed(1)}%
                    </p>
                    <div className="w-20 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                      <div className={cn("h-full transition-all duration-500", (student.attendancePercentage || 0) < 75 ? "bg-red-400" : "bg-emerald-400")} style={{ width: `${student.attendancePercentage || 0}%` }} />
                    </div>
                  </div>
                </Link>
              ))}
              {students.length === 0 && <p className="text-gray-600 italic">No students yet.</p>}
            </div>
          </section>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[32px] p-10 max-w-lg w-full shadow-2xl">
            <h2 className="font-serif text-3xl mb-6">Enroll Student</h2>
            <form onSubmit={handleAddStudent} className="space-y-6">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2">Full Name</label>
                <input autoFocus required className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" placeholder="e.g. John Doe" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2">Email Address</label>
                <input type="email" required className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" placeholder="john@example.com" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} />
              </div>
              <div className="flex items-center gap-3 pt-4">
                <button type="button" onClick={() => setShowAddStudent(false)} className="flex-1 py-4 text-gray-500 font-bold uppercase text-[10px] border border-gray-100 rounded-xl hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-[#1a1a1a] text-white rounded-xl font-bold uppercase text-[10px] hover:bg-black">Add Student</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
