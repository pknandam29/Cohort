import { getApiUrl } from '..\lib\api';\nimport { useUsers } from '../hooks/useData';
import { motion } from 'motion/react';
import { UserPlus, Trash2, Shield, User } from 'lucide-react';
import { useState, FormEvent } from 'react';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export function UserManagement() {
  const { users, loading, refresh } = useUsers();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', fullName: '', email: '', role: 'trainer' });

  const handleAddUser = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(getApiUrl('/api/users'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('User created!');
      setShowAddModal(false);
      setNewUser({ username: '', password: '', fullName: '', email: '', role: 'trainer' });
      refresh();
    } catch (err: any) { toast.error(err.message || 'Failed'); }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await fetch(getApiUrl(`/api/users/${id}`), { method: 'DELETE' });
      toast.success('User deleted');
      refresh();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl lg:text-5xl text-[#1a1a1a] mb-2 tracking-tight">User Management</h1>
          <p className="text-gray-500 font-sans tracking-wide uppercase text-xs font-bold">Manage trainers & administrators</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="px-5 py-3 bg-[#5A5A40] text-white rounded-2xl flex items-center gap-2 hover:bg-[#4a4a35] transition-all font-bold text-sm">
          <UserPlus size={18} /> Add User
        </button>
      </header>

      <div className="bg-white rounded-[40px] border border-[#e5e5e0] overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-8 py-5 text-[10px] uppercase font-bold text-gray-400 tracking-widest">User</th>
              <th className="px-8 py-5 text-[10px] uppercase font-bold text-gray-400 tracking-widest">Username</th>
              <th className="px-8 py-5 text-[10px] uppercase font-bold text-gray-400 tracking-widest hidden md:table-cell">Email</th>
              <th className="px-8 py-5 text-[10px] uppercase font-bold text-gray-400 tracking-widest">Role</th>
              <th className="px-8 py-5 text-[10px] uppercase font-bold text-gray-400 tracking-widest hidden md:table-cell">Joined</th>
              <th className="px-8 py-5 text-right text-[10px] uppercase font-bold text-gray-400 tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user, i) => (
              <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="hover:bg-gray-50 transition-colors">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold", user.role === 'admin' ? 'bg-[#5A5A40]' : 'bg-gray-400')}>
                      {user.fullName?.[0]}
                    </div>
                    <p className="font-bold text-[#1a1a1a]">{user.fullName}</p>
                  </div>
                </td>
                <td className="px-8 py-5 font-mono text-sm text-gray-500">{user.username}</td>
                <td className="px-8 py-5 text-sm text-gray-500 hidden md:table-cell">{user.email}</td>
                <td className="px-8 py-5">
                  <span className={cn("inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase",
                    user.role === 'admin' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-600'
                  )}>
                    {user.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                    {user.role}
                  </span>
                </td>
                <td className="px-8 py-5 text-sm text-gray-400 hidden md:table-cell">{format(new Date(user.createdAt), 'MMM dd, yyyy')}</td>
                <td className="px-8 py-5 text-right">
                  <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[32px] p-10 max-w-lg w-full shadow-2xl">
            <h2 className="font-serif text-3xl mb-6">Create New User</h2>
            <form onSubmit={handleAddUser} className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2">Full Name</label>
                <input autoFocus required className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2">Username</label>
                <input required className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2">Password</label>
                <input type="password" required className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2">Email</label>
                <input type="email" className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-2">Role</label>
                <select className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                  <option value="trainer">Trainer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 text-gray-500 font-bold uppercase text-[10px] border border-gray-100 rounded-xl hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-[#1a1a1a] text-white rounded-xl font-bold uppercase text-[10px] hover:bg-black">Create User</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
