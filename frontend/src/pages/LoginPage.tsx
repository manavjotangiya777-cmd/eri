import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Building2, Eye, EyeOff, Lock, User as UserIcon } from 'lucide-react';
import { getSystemSettings } from '@/db/api';
import { FILE_BASE } from '@/config';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const { signInWithUsername } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as { from?: string })?.from || '/';

  useEffect(() => {
    getSystemSettings().then(setSettings).catch(console.error);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast({
        title: 'Error',
        description: 'Please enter your email/username and password',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await signInWithUsername(username, password);

    if (error) {
      setLoading(false);
      toast({
        title: 'Login Failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      await new Promise(resolve => setTimeout(resolve, 500));
      setLoading(false);

      toast({
        title: 'Success',
        description: 'Logged in successfully. Redirecting...',
      });

      setTimeout(() => {
        navigate(from, { replace: true });
      }, 300);
    }
  };

  return (
    <div className="flex min-h-screen bg-white relative">
      {/* Global Logo Position: Top Left / Top Center on Mobile */}
      <div className="absolute top-6 left-6 lg:top-8 lg:left-8 z-50 w-full lg:w-auto flex justify-start pr-12 lg:pr-0">
        {settings?.company_logo ? (
          <img
            src={settings.company_logo.startsWith('http') ? settings.company_logo : `${FILE_BASE}${settings.company_logo}`}
            alt="Logo"
            className="h-10 lg:h-12 w-auto object-contain brightness-100 lg:brightness-0 transition-all"
          />
        ) : (
          <div className="flex items-center gap-2">
            <Building2 className="h-7 w-7 lg:h-8 lg:w-8 text-slate-800 lg:text-white" />
            <span className="font-bold text-lg lg:text-xl text-slate-900 lg:text-white">
              {settings?.company_name || 'error Infotech'}
            </span>
          </div>
        )}
      </div>

      {/* Left Side: Image Only */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900">
        <img
          src="/images/login-bg.png"
          alt="Login Background"
          className="absolute inset-0 w-full h-full object-cover opacity-70"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement!.classList.add('bg-gradient-to-br', 'from-indigo-900', 'to-slate-900');
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/40 to-transparent" />
      </div>

      {/* Right Side: Login Form Section */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-slate-50 relative">
        <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-right-8 duration-700">
          <CardHeader className="space-y-1 px-0 pb-8 text-center lg:text-left">
            <CardTitle className="text-3xl font-black text-slate-900 tracking-tight">Welcome Back</CardTitle>
            <CardDescription className="text-base text-slate-500">
              Please enter your details to sign in
            </CardDescription>
          </CardHeader>

          <CardContent className="px-0">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="login-username" className="text-slate-700 text-sm font-bold ml-1">
                  Email or Username
                </Label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="login-username"
                    type="text"
                    placeholder="Enter email or username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    className="pl-12 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-primary/20 focus:border-primary transition-all rounded-xl h-12 shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="login-password" className="text-slate-700 text-sm font-bold">
                    Password
                  </Label>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="pl-12 pr-12 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-primary/20 focus:border-primary transition-all rounded-xl h-12 shadow-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-10 px-3 hover:bg-transparent text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xl shadow-slate-200 transition-all hover:translate-y-[-2px] active:translate-y-[0px] mt-4"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Sign In to Dashboard'
                )}
              </Button>

              <div className="mt-8 pt-8 border-t border-slate-200/60 text-center lg:text-left">
                <p className="text-xs text-slate-400 font-medium">
                  © {new Date().getFullYear()} {settings?.company_name || 'error Infotech'}. All rights reserved.
                </p>
              </div>
            </form>
          </CardContent>
        </div>
      </div>
    </div>
  );
}
