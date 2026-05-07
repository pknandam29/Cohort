import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export function StudentDetail() {
  const { id } = useParams();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(getApiUrl(`/api/students/${id}`)).then(r => r.json()).then(setStudent).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="animate-pulse text-center p-20">Loading student data...</div>;
  if (!student) return <div className="text-center p-20 text-gray-400">Student not found.</div>;

  const presentCount = student.attendanceHistory?.filter((a: any) => a.status === 'present').length || 0;
  const absentCount = student.attendanceHistory?.filter((a: any) => a.status === 'absent').length || 0;
  const totalSessions = student.attendanceHistory?.length || 0;

  return (
    <div className="space-y-10">
      <header className="flex items-start gap-6">
        <Link to={`/batches/${student.batchId}`} className="mt-2 w-12 h-12 rounded-2xl bg-white border border-[#e5e5e0] flex items-center justify-center text-gray-400 hover:text-[#1a1a1a] transition-all">
          <ChevronLeft size={24} />
        </Link>
        <div>
          <h1 className="font-serif text-4xl lg:text-5xl text-[#1a1a1a] tracking-tight mb-2">{student.name}</h1>
          <p className="text-gray-500 font-sans">{student.email} • <span className="text-[#5A5A40] font-bold">{student.batchName}</span></p>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-[32px] border border-[#e5e5e0]">
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-1">Attendance</p>
          <h3 className={cn("text-4xl font-serif", (student.attendancePercentage || 0) < 75 ? "text-red-500" : "text-emerald-600")}>{(student.attendancePercentage || 0).toFixed(1)}%</h3>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-emerald-50 p-8 rounded-[32px] border border-emerald-100">
          <p className="text-emerald-600 font-bold uppercase tracking-widest text-[10px] mb-1">Present</p>
          <h3 className="text-4xl font-serif text-emerald-700">{presentCount}</h3>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-red-50 p-8 rounded-[32px] border border-red-100">
          <p className="text-red-500 font-bold uppercase tracking-widest text-[10px] mb-1">Absent</p>
          <h3 className="text-4xl font-serif text-red-600">{absentCount}</h3>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-8 rounded-[32px] border border-[#e5e5e0]">
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-1">Sessions</p>
          <h3 className="text-4xl font-serif text-[#1a1a1a]">{totalSessions}</h3>
        </motion.div>
      </div>

      {/* Attendance History */}
      <div className="bg-white p-10 rounded-[40px] border border-[#e5e5e0]">
        <h2 className="font-serif text-2xl text-[#1a1a1a] mb-8">Attendance History</h2>

        {/* Visual Grid */}
        <div className="flex flex-wrap gap-2 mb-8">
          {student.attendanceHistory?.map((record: any, i: number) => (
            <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.03 }}
              className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold",
                record.status === 'present' ? 'bg-emerald-500' : 'bg-red-400'
              )} title={`Session ${record.sessionNumber}: ${record.status}`}>
              S{record.sessionNumber}
            </motion.div>
          ))}
        </div>

        {/* Detailed Table */}
        <div className="overflow-hidden bg-gray-50 rounded-3xl border border-gray-100">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="px-8 py-5 text-[10px] uppercase font-bold text-gray-400 tracking-widest">Session</th>
                <th className="px-8 py-5 text-[10px] uppercase font-bold text-gray-400 tracking-widest">Date</th>
                <th className="px-8 py-5 text-[10px] uppercase font-bold text-gray-400 tracking-widest">Topic</th>
                <th className="px-8 py-5 text-right text-[10px] uppercase font-bold text-gray-400 tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {student.attendanceHistory?.map((record: any, i: number) => (
                <tr key={i} className="hover:bg-white transition-colors">
                  <td className="px-8 py-4 font-bold text-[#1a1a1a]">Session {record.sessionNumber}</td>
                  <td className="px-8 py-4 text-sm text-gray-500">{format(new Date(record.date), 'MMM dd, yyyy')}</td>
                  <td className="px-8 py-4 text-sm text-gray-500">{record.title}</td>
                  <td className="px-8 py-4 text-right">
                    {record.status === 'present' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold"><CheckCircle2 size={14} /> Present</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-500 rounded-full text-xs font-bold"><XCircle size={14} /> Absent</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
