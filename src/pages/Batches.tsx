import { cn } from '../lib/utils';
import { useBatches } from '../hooks/useData';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Users, Calendar, Plus, ArrowUpRight, Trash2, Search, Archive, ArchiveRestore } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useState, FormEvent } from 'react';
import { toast } from 'react-hot-toast';

export function Batches() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const { batches, loading, refresh } = useBatches(searchTerm, showArchived);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBatch, setNewBatch] = useState({ name: '', description: '', startDate: format(new Date(), 'yyyy-MM-dd') });



  const handleAddBatch = async (e: FormEvent) => {
    e.preventDefault();
    if (!newBatch.name) return;
    try {
      await fetch(getApiUrl('/api/batches'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newBatch) });
      toast.success('Batch created with 12 sessions!');
      setShowAddModal(false);
      setNewBatch({ name: '', description: '', startDate: format(new Date(), 'yyyy-MM-dd') });
      refresh();
    } catch { toast.error('Failed to create batch'); }
  };

  const handleDeleteBatch = async (id: number) => {
    if (!window.confirm('Delete this batch permanently?')) return;
    try {
      await fetch(getApiUrl(`/api/batches/${id}`), { method: 'DELETE' });
      toast.success('Batch deleted');
      refresh();
    } catch { toast.error('Failed to delete'); }
  };

  const handleArchiveBatch = async (id: number, archive: boolean) => {
    try {
      await fetch(getApiUrl(`/api/batches/${id}/archive`), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: archive }) });
      toast.success(archive ? 'Batch archived' : 'Batch restored');
      refresh();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-10">
      <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl lg:text-5xl text-[#1a1a1a] mb-2 tracking-tight">Batches</h1>
          <p className="text-gray-500 font-sans tracking-wide uppercase text-xs font-bold">Institutional grouping & scheduling</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {profile?.role === 'admin' && (
            <>

              <button onClick={() => setShowAddModal(true)} className="px-5 py-3 bg-[#5A5A40] text-white rounded-2xl flex items-center gap-2 hover:bg-[#4a4a35] transition-all shadow-lg shadow-[#5A5A4020] font-bold text-sm">
                <Plus size={18} /> New Batch
              </button>
            </>
          )}
        </div>
      </header>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search batches..."
            className="w-full pl-12 pr-5 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] transition-all bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={cn(
            "px-5 py-3 rounded-2xl flex items-center gap-2 font-bold text-sm transition-all border",
            showArchived ? "bg-[#5A5A40] text-white border-[#5A5A40]" : "border-gray-200 text-gray-500 hover:bg-gray-50"
          )}
        >
          <Archive size={16} />
          {showArchived ? 'Showing All' : 'Show Archived'}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-white rounded-[32px] animate-pulse border border-[#e5e5e0]" />)}
        </div>
      ) : batches.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-[#e5e5e0] p-20 text-center">
          <p className="text-gray-400 italic text-lg">No batches found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch, i) => (
            <motion.div key={batch.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={cn(
                "bg-white rounded-[32px] border overflow-hidden group hover:border-[#5A5A40] transition-colors flex flex-col",
                batch.archived ? "border-amber-200 opacity-70" : "border-[#e5e5e0]"
              )}>
              <div className="p-8 flex-1">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-3 bg-gray-50 rounded-xl text-gray-400 group-hover:text-[#5A5A40] transition-colors">
                      <Users size={24} />
                    </div>
                    {batch.archived && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[9px] font-bold uppercase">Archived</span>}
                  </div>
                  {profile?.role === 'admin' && (
                    <div className="flex gap-1">
                      <button onClick={() => handleArchiveBatch(batch.id, !batch.archived)} className="p-2 text-gray-300 hover:text-amber-500 transition-colors" title={batch.archived ? 'Restore' : 'Archive'}>
                        {batch.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                      </button>
                      <button onClick={(e) => { e.preventDefault(); handleDeleteBatch(batch.id); }} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <h3 className="font-serif text-2xl text-[#1a1a1a] mb-2 group-hover:text-[#5A5A40] transition-colors">{batch.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-6 h-10">{batch.description || 'No description provided.'}</p>
                <div className="flex items-center gap-6 text-xs font-bold text-gray-400 uppercase tracking-widest">
                  <div className="flex items-center gap-1.5"><Calendar size={14} />{format(new Date(batch.startDate), 'MMM dd, yyyy')}</div>
                  <div className="flex items-center gap-1.5"><Users size={14} />{batch.studentCount || 0} Students</div>
                </div>
              </div>
              <div className="px-8 py-6 bg-gray-50 border-t border-[#e5e5e0] flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Attendance</p>
                  <p className={cn("text-lg font-serif", (batch.averageAttendance || 0) < 75 ? "text-red-500" : "text-[#1a1a1a]")}>
                    {(batch.averageAttendance || 0).toFixed(1)}%
                  </p>
                </div>
                <Link to={`/batches/${batch.id}`} className="w-10 h-10 rounded-full bg-white border border-[#e5e5e0] flex items-center justify-center text-gray-400 hover:bg-[#1a1a1a] hover:text-white transition-all shadow-sm">
                  <ArrowUpRight size={18} />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[32px] p-10 max-w-lg w-full shadow-2xl">
            <h2 className="font-serif text-3xl mb-6">Create New Batch</h2>
            <form onSubmit={handleAddBatch} className="space-y-6">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2">Batch Name</label>
                <input autoFocus required className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" placeholder="e.g. Fullstack Dev - Spring 2026" value={newBatch.name} onChange={e => setNewBatch({...newBatch, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2">Description</label>
                <textarea className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] h-24" placeholder="Batch details..." value={newBatch.description} onChange={e => setNewBatch({...newBatch, description: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2">Start Date</label>
                <input type="date" required className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" value={newBatch.startDate} onChange={e => setNewBatch({...newBatch, startDate: e.target.value})} />
              </div>
              <div className="flex items-center gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-gray-500 font-bold uppercase text-[10px] border border-gray-100 rounded-xl hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-[#1a1a1a] text-white rounded-xl font-bold uppercase text-[10px] hover:bg-black">Create Batch</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
