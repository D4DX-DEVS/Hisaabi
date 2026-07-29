import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/adminApi';
import { ArrowLeft, Trash2, ScrollText, ExternalLink, Calendar, Mail, User as UserIcon, Activity, Key, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';
import SuccessModal from '../components/SuccessModal';
import { useState } from 'react';

const activityTypeColors = {
  prayer: 'bg-blue-50 text-blue-600 border-blue-100',
  quran_reading: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  quran_memorization: 'bg-teal-50 text-teal-600 border-teal-100',
  dhikr: 'bg-purple-50 text-purple-600 border-purple-100',
  fasting: 'bg-orange-50 text-orange-600 border-orange-100',
  dua_memorization: 'bg-pink-50 text-pink-600 border-pink-100',
};

const streakTypeLabel = {
  prayer: 'Prayer',
  quran_reading: 'Quran Reading',
  dhikr: 'Dhikr',
  combined: 'Combined',
};

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0 text-sm">
      <div className="flex items-center gap-2 text-slate-500 font-medium">
        {Icon && <Icon size={16} className="text-slate-400" />}
        {label}
      </div>
      <span className="font-bold text-slate-800 text-right max-w-[280px] break-all">{value ?? '—'}</span>
    </div>
  );
}

function StreakCard({ type, data }) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all hover:border-emerald-100 group">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
        {streakTypeLabel[type] || type.replace(/_/g, ' ')}
      </p>
      <div className="flex items-end justify-between mb-4">
        <p className="text-4xl font-black text-emerald-500 group-hover:scale-105 transition-transform origin-left">{data?.current_streak ?? 0}</p>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Longest</p>
          <p className="text-sm font-bold text-slate-700">{data?.longest_streak ?? 0}</p>
        </div>
      </div>
      {data?.last_activity_date ? (
        <div className="mt-auto flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded-lg w-fit">
          <Calendar size={12} />
          {new Date(data.last_activity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      ) : (
        <div className="mt-auto text-xs font-medium text-slate-300">No activity yet</div>
      )}
    </div>
  );
}

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => adminApi.getUserDetail(id).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries(['admin-users']);
      setIsDeleteModalOpen(false);
      setIsSuccessModalOpen(true);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Delete failed');
      setIsDeleteModalOpen(false);
    }
  });

  if (isLoading) return (
    <div className="p-12 flex flex-col items-center justify-center text-slate-400">
      <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      Loading user profile...
    </div>
  );
  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600 max-w-2xl mx-auto flex flex-col items-center text-center">
      <Trash2 size={40} className="mb-3 opacity-50" />
      <h3 className="font-bold text-lg mb-1">Failed to load user</h3>
      <p className="text-sm opacity-80">This user may have been deleted or there was a network error.</p>
      <button onClick={() => navigate('/users')} className="mt-4 px-4 py-2 bg-white border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors">Return to Users</button>
    </div>
  );

  const { user, streaks = [], recent_activity = [] } = data || {};

  return (
    <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col min-h-0 gap-6">

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <button
          onClick={() => navigate('/users')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium w-fit transition-colors group"
        >
          <div className="p-1.5 rounded-lg group-hover:bg-white group-hover:shadow-sm">
            <ArrowLeft size={16} />
          </div>
          Back to Users
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/activity-logs?user_id=${id}`)}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-brand-600 font-semibold bg-white border border-slate-200 rounded-xl px-4 py-2 hover:border-brand-300 hover:shadow-sm transition-all"
          >
            <ScrollText size={16} />
            View Full Logs
          </button>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex items-center gap-2 text-sm text-red-600 hover:text-white hover:bg-red-600 font-semibold bg-white border border-red-200 rounded-xl px-4 py-2 hover:shadow-sm transition-all shadow-sm"
          >
            <Trash2 size={16} /> Delete Account
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column - Profile Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative">
            <div className="h-24 bg-gradient-to-tr from-brand-600 to-emerald-400 absolute top-0 left-0 w-full z-0"></div>

            <div className="relative z-10 p-6 pt-12 flex flex-col items-center text-center">
              <div className="h-20 w-20 rounded-full bg-white p-1 mb-4 shadow-sm">
                <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-2xl font-black text-slate-400 uppercase">
                  {user?.name ? user.name.charAt(0) : <UserIcon size={24} />}
                </div>
              </div>

              <h1 className="text-xl font-bold text-slate-800 font-display mb-1">{user?.name || 'Unnamed User'}</h1>
              <p className="text-sm text-slate-500 font-medium mb-4">{user?.email || 'No email provided'}</p>

              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold capitalize mb-6 ${user?.gender === 'm' ? 'bg-blue-50 text-blue-600' :
                user?.gender === 'f' ? 'bg-rose-50 text-rose-600' :
                  'bg-slate-100 text-slate-600'
                }`}>
                {user?.gender === 'm' ? 'Male' : user?.gender === 'f' ? 'Female' : 'Unknown Gender'}
              </span>

              <div className="w-full text-left space-y-1">
                <InfoRow label="User ID" value={user?.uid?.substring(0, 12) + "..."} icon={Key} />
                <InfoRow label="DOB" value={user?.dob} icon={Calendar} />
                <InfoRow label="Joined" value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'} icon={ClockIcon} />
              </div>
            </div>
          </div>

          {/* Goals snapshot */}
          {user?.settings?.goals && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-2 mb-4 text-brand-600">
                <Target size={18} />
                <h2 className="font-bold text-slate-800 text-lg font-display">Daily Goals</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(user.settings.goals).map(([key, val]) => (
                  <div key={key} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{key.replace(/_/g, ' ')}</p>
                    <p className="text-xl font-black text-slate-800">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Stats & Activity */}
        <div className="lg:col-span-2 space-y-6">

          {/* Streaks */}
          {streaks.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-2 mb-6 text-orange-500">
                <Activity size={18} />
                <h2 className="font-bold text-slate-800 text-lg font-display">Current Streaks</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {streaks.map((s) => (
                  <StreakCard key={s.streak_type} type={s.streak_type} data={s} />
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-50 rounded-lg text-slate-500">
                  <ScrollText size={18} />
                </div>
                <h2 className="font-bold text-slate-800 text-lg font-display">Recent Activity</h2>
              </div>
              <span className="text-xs font-bold bg-slate-100 px-2.5 py-1 rounded-md text-slate-500">Last 20</span>
            </div>

            {recent_activity.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <ScrollText size={32} className="mx-auto mb-3" />
                <p className="font-medium text-slate-500">No recent activity found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recent_activity.map((a) => (
                  <div key={a._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all gap-2 group">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex min-w-[120px] justify-center text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg border ${activityTypeColors[a.activity_type] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {a.activity_type?.replace(/_/g, ' ')}
                      </span>
                      {a.details && Object.keys(a.details).length > 0 && (
                        <span className="text-slate-500 font-mono text-[11px] truncate max-w-[200px]">
                          {JSON.stringify(a.details).replace(/[{}]/g, '')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors bg-white px-2 py-1 rounded-md border border-slate-100 whitespace-nowrap self-start sm:self-auto">
                      {a.date}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Account"
        message={`Are you absolutely sure you want to delete ${user?.name || 'this user'}'s account? All data, streaks, and tracking history will be permanently erased.`}
        confirmText="Yes, delete everything"
        cancelText="Cancel"
        type="danger"
      />

      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => {
          setIsSuccessModalOpen(false);
          navigate('/users');
        }}
        title="User Deleted"
        message="The user account has been permanently removed."
      />
    </div>
  );
}

// Helper icon component since lucide-react doesn't have ClockIcon but has Clock
const ClockIcon = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
