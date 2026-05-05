import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isParent, setIsParent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [parentPin, setParentPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        // Update profile with role
        if (data.user) {
          await supabase.from('profiles').update({
            display_name: displayName,
            role: isParent ? 'parent' : 'daughter',
          }).eq('user_id', data.user.id);

          // If parent, try to connect via PIN
          if (isParent && parentPin) {
            const { data: conn } = await supabase
              .from('parent_connections')
              .select('*')
              .eq('pin_code', parentPin)
              .eq('status', 'pending')
              .single();
            if (conn) {
              await supabase.from('parent_connections').update({
                parent_user_id: data.user.id,
                status: 'active',
              }).eq('id', conn.id);
              toast.success('Connected to your daughter\'s account!');
            } else {
              toast.error('PIN not found or already used');
            }
          }
        }
        toast.success('Account created! You may need to verify your email.');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">My Nutrition Tracker</h1>
          <p className="text-muted-foreground">Your friendly meal exchange companion 🌟</p>
        </div>

        {!isLogin && (
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setIsParent(false)}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                !isParent
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              Tracking for myself 💪
            </button>
            <button
              type="button"
              onClick={() => setIsParent(true)}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                isParent
                  ? 'bg-secondary text-secondary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              I'm a supporter 🧡
            </button>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <Input
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded-xl h-12"
              required
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl h-12"
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl h-12"
            required
            minLength={6}
          />
          {!isLogin && isParent && (
            <Input
              placeholder="Enter 6-digit PIN from the person you're supporting"
              value={parentPin}
              onChange={(e) => setParentPin(e.target.value)}
              className="rounded-xl h-12"
              maxLength={6}
            />
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl text-base font-semibold"
          >
            {loading ? '...' : isLogin ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center mt-6 text-sm text-muted-foreground">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-semibold underline"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
