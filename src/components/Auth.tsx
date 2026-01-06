import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { ShieldAlert, Activity, Info } from 'lucide-react';

interface AuthProps {
  onLogin: (session: any, role: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState<'borrower' | 'agent'>('borrower');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
        setError("Supabase not configured. Please check API keys.");
        return;
    }
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role } // Pass role to metadata for trigger (if needed) or handle in profile creation
          }
        });
        if (error) throw error;
        
        if (data.user) {
            alert('Signup successful! Please log in.');
            setIsSignUp(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Fetch Role from Metadata
        if (data.user) {
            const userRole = data.user.user_metadata?.role || 'borrower';
            onLogin(data.session, userRole);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-xl max-w-md w-full">
        <div className="flex flex-col items-center mb-6">
            <div className="p-3 bg-emerald-50 rounded-full text-emerald-600 mb-3">
                <Activity size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Syndicate<span className="text-emerald-600">Bridge</span></h1>
            <p className="text-slate-500 text-sm">Secure Compliance Platform</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg mb-6 text-xs flex items-start gap-2">
            <Info size={16} className="mt-0.5 shrink-0" />
            <div>
                <p className="font-semibold">Notice: Mock Data</p>
                <p>This platform is currently in demo mode. All data presented, including borrower details and facility balances, is mock data for demonstration purposes.</p>
            </div>
        </div>

        {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                <ShieldAlert size={16} />
                {error}
            </div>
        )}
        
        {!isSupabaseConfigured() && (
             <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg mb-6 text-xs">
                <strong>Demo Mode Only:</strong> Supabase environment variables are missing. Auth will be simulated.
            </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-900"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {isSignUp && (
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">I am a...</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setRole('borrower')}
                        className={`p-2 rounded-lg border text-sm font-medium transition-colors ${role === 'borrower' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                        Borrower
                    </button>
                    <button
                        type="button"
                        onClick={() => setRole('agent')}
                        className={`p-2 rounded-lg border text-sm font-medium transition-colors ${role === 'agent' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                        Facility Agent
                    </button>
                </div>
             </div>
          )}

          <button 
            type="submit" 
            disabled={loading || !isSupabaseConfigured()}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100">
             <div className="text-center mb-4">
                <button 
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm text-emerald-600 hover:underline"
                >
                    {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Create one'}
                </button>
             </div>

             <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-slate-500">Sample Credentials</span>
                </div>
            </div>

            <div className="space-y-4 mb-6">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                    <p className="font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Borrower Account
                    </p>
                    <p className="text-slate-500"><span className="font-medium">Email:</span> borrower_demo@bridge.com</p>
                    <p className="text-slate-500"><span className="font-medium">Password:</span> testdemo</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                    <p className="font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Facility Agent Account
                    </p>
                    <p className="text-slate-500"><span className="font-medium">Email:</span> agent_demo@bridge2.com</p>
                    <p className="text-slate-500"><span className="font-medium">Password:</span> testdemo</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
