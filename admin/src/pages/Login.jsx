import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../api/adminApi';
import toast from 'react-hot-toast';
import { Lock, User } from 'lucide-react';
import SuccessModal from '../components/SuccessModal';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [successState, setSuccessState] = useState({ isOpen: false, token: null });

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await adminApi.login(form);
      setSuccessState({ isOpen: true, token: data.token });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans animate-fade-in relative bg-slate-50">

      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-500/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10 w-full">
        <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl shadow-slate-200/50 flex overflow-hidden border border-slate-100">

          {/* Left Side - Graphic / Branding (Hidden on small screens) */}
          <div className="hidden lg:flex w-1/2 bg-slate-900 p-12 flex-col justify-between relative overflow-hidden text-white">
            {/* Dark Side Background Decoration */}
            <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1519817650390-64a93db51149?q=80&w=2787&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/40 z-0"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-xl">
                  <img src="/color.png" alt="Hisabi Logo" className="h-8 w-auto object-contain" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white font-display">Hisabi</span>
              </div>
            </div>

            <div className="relative z-10 mt-auto">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 font-display leading-tight">
                Empower Your <br />
                <span className="text-emerald-400">Community.</span>
              </h1>
              <p className="text-slate-300 text-lg max-w-md leading-relaxed">
                A modern administrative dashboard built for seamless management and analytics tracking.
              </p>
            </div>

            {/* Small decorative circles bottom right */}
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/20 blur-[80px] z-0" />
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full lg:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-white relative">
            <div className="max-w-md w-full mx-auto">

              <div className="lg:hidden flex justify-center mb-8">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm animate-fade-in">
                  <img src="/color.png" alt="Hisabi Logo" className="h-12 w-auto object-contain" />
                </div>
              </div>

              <div className="mb-10 text-center lg:text-left">
                <h2 className="text-3xl font-bold text-slate-900 font-display mb-2">Welcome Back</h2>
                <p className="text-slate-500 text-base">Please enter your credentials to continue.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Username</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none pb-0.5">
                      <User className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      required
                      placeholder="admin"
                      className="block w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-semibold text-slate-700">Password</label>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none pb-0.5">
                      <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                    </div>
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      placeholder="••••••••"
                      className="block w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full relative flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/30"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Authenticating...
                      </span>
                    ) : (
                      'Sign In to Dashboard'
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-8 text-center">
                <p className="text-xs text-slate-400 font-medium tracking-wide flex items-center justify-center gap-1.5">
                  <Lock size={12} /> Secure Portal
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SuccessModal
        isOpen={successState.isOpen}
        onClose={() => {
          setSuccessState({ isOpen: false, token: null });
          login(successState.token);
          navigate('/');
        }}
        title="Welcome Back!"
        message="Authentication successful. Loading your dashboard..."
        autoCloseTimeout={2000}
      />
    </div>
  );
}
