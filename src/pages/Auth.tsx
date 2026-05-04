import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { MapPin, Loader2 } from "lucide-react";

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("נרשמת בהצלחה! בדוק את האימייל שלך לאישור.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "שגיאה לא ידועה";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("התחברות נכשלה");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--gradient-hero)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-[var(--shadow-elevated)]" style={{ background: "var(--gradient-primary)" }}>
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">ParkEasy</h1>
          <p className="text-muted-foreground mt-2">מצא חניה בזמן אמת בעזרת הקהילה</p>
        </div>

        <Card className="p-6 shadow-[var(--shadow-soft)]">
          <div className="flex gap-2 p-1 bg-muted rounded-lg mb-6">
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${mode === "signin" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              התחברות
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${mode === "signup" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              הרשמה
            </button>
          </div>

          <form onSubmit={handleEmail} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">שם</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="השם שלך" />
              </div>
            )}
            <div>
              <Label htmlFor="email">אימייל</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" dir="ltr" />
            </div>
            <div>
              <Label htmlFor="password">סיסמה</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
            </div>
            <Button type="submit" className="w-full" disabled={busy} size="lg">
              {busy && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              {mode === "signin" ? "התחבר" : "הירשם"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">או</span></div>
          </div>

          <Button onClick={handleGoogle} variant="outline" className="w-full" disabled={busy} size="lg">
            <svg className="w-4 h-4 ml-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            המשך עם Google
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
