import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, UsersRound, ScrollText, LogOut,
  BookOpen, Sparkles, Moon, Activity, HandHeart,
  Flame, BookMarked, BookCheck, BookOpenCheck, TrendingUp,
  LibraryBig, GraduationCap, Menu, X, Tag, Quote, Star, Radio, Megaphone, Layers
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const mainNav = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/users', label: 'Users', Icon: Users },
  { to: '/groups', label: 'Groups', Icon: UsersRound },
  { to: '/group-activities', label: 'Group Activities', Icon: Activity },
  { to: '/activity-logs', label: 'Activity Logs', Icon: ScrollText },
];

const contentNav = [
  { to: '/content/duas', label: 'Duas', Icon: BookOpen },
  { to: '/content/dua-categories', label: 'Dua Categories', Icon: Tag },
  { to: '/content/dhikr-categories', label: 'Dhikr Categories', Icon: Tag },
  { to: '/content/dhikr-types', label: 'Adhkar', Icon: Sparkles },
  { to: '/content/thasbeehs', label: 'Thasbeehs', Icon: Sparkles },
  { to: '/content/fasting-types', label: 'Fasting Types', Icon: Moon },
  { to: '/content/ramadan', label: 'Ramadan', Icon: Moon },
  { to: '/content/quran-reading-portions', label: 'Reading Portions', Icon: LibraryBig },
  { to: '/content/quran-memorization-portions', label: 'Memorization Portions', Icon: GraduationCap },
  { to: '/content/library', label: 'Library', Icon: LibraryBig },
  { to: '/special-models', label: 'Special Models', Icon: Layers },
  { to: '/content/daily-quotes', label: 'Daily Quotes', Icon: Quote },
  { to: '/content/friday-quotes', label: 'Friday Quotes', Icon: Quote },
  { to: '/content/hadees', label: 'Hadees', Icon: BookOpen },
  { to: '/content/hadees-categories', label: 'Hadees Categories', Icon: Tag },
  { to: '/content/names-of-allah', label: 'Names of Allah', Icon: Star },
  { to: '/content/live-links', label: 'Live Links', Icon: Radio },
  { to: '/content/banners', label: 'Banners', Icon: Megaphone },
];

const trackingNav = [
  { to: '/tracking/prayers', label: 'Prayer Tracking', Icon: HandHeart },
  { to: '/tracking/dhikr', label: 'Dhikr Tracking', Icon: Sparkles },
  { to: '/tracking/fasting', label: 'Fasting Days', Icon: Flame },
  { to: '/tracking/quran-reading', label: 'Quran Reading', Icon: BookMarked },
  { to: '/tracking/quran-memorization', label: 'Quran Memorization', Icon: BookCheck },
  { to: '/tracking/quran-progress', label: 'Quran Progress', Icon: BookOpenCheck },
  { to: '/tracking/dua-memorization', label: 'Dua Memorization', Icon: Activity },
  { to: '/tracking/streaks', label: 'Streaks Overview', Icon: TrendingUp },
];

function NavSection({ title, items, closeSidebar }) {
  return (
    <div className="mb-5">
      <h3 className="px-2.5 mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 font-display">{title}</h3>
      <div className="space-y-1">
        {items.map(({ to, label, Icon }) => {
          const NavIcon = Icon;
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `group flex items-center justify-between px-2.5 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 ${isActive
                  ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100/50'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-md transition-colors ${isActive ? 'bg-emerald-100/50 text-emerald-600' : 'bg-slate-100/50 text-slate-400 group-hover:bg-slate-200/50 group-hover:text-slate-600'}`}>
                    <NavIcon size={14} />
                  </div>
                  {label}
                </div>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleLogoutConfirm = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex h-screen bg-slate-50/50 overflow-hidden font-sans text-slate-800">

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>

        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-50 shrink-0">
          <NavLink to="/" className="flex items-center gap-2.5 group" onClick={closeSidebar}>
            <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100 group-hover:bg-white group-hover:shadow-sm transition-all">
              <img src="/color.png" alt="Hisabi Logo" className="h-7 w-7 object-contain" />
            </div>
            <span className="text-lg font-black font-display tracking-tight text-slate-800 group-hover:text-emerald-600 transition-colors">Hisaabi</span>
          </NavLink>
          <button onClick={closeSidebar} className="lg:hidden p-2 text-slate-400 hover:bg-slate-50 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Navigation Area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-4">
          <NavSection title="Core Platform" items={mainNav} closeSidebar={closeSidebar} />
          <NavSection title="Content Catalogues" items={contentNav} closeSidebar={closeSidebar} />
          <NavSection title="Tracking Data" items={trackingNav} closeSidebar={closeSidebar} />
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-50 shrink-0 bg-slate-50/50">
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] font-bold text-slate-600 bg-white border border-slate-200 hover:border-red-200 hover:text-red-600 hover:bg-red-50 hover:shadow-sm transition-all group"
          >
            <LogOut size={14} className="text-slate-400 group-hover:text-red-500 transition-colors" />
            <span className="group-hover:translate-x-0.5 transition-transform">Secure Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">

        {/* Mobile menu toggle — only visible on small screens since header is removed */}
        <div className="lg:hidden flex items-center px-4 py-3 border-b border-slate-100 shrink-0">
          <button
            onClick={toggleSidebar}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden flex flex-col relative z-10 w-full">
          <div className="animate-fade-in flex-1 min-h-0 overflow-y-auto scrollbar-hide">
            <div className="mx-auto w-full max-w-[1440px] p-3 sm:p-5 h-full flex flex-col">
              {children}
            </div>
          </div>
        </main>
      </div>

      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
        title="Secure Sign Out"
        message="Are you sure you want to end your current session and securely sign out of the administrative portal?"
        confirmText="Yes, sign me out"
        cancelText="Cancel"
        type="logout"
      />
    </div>
  );
}
