import { useEffect, useState, useMemo } from "react";
import { supabase, type Birthday } from "./lib/supabase";

declare global {
  interface Window {
    Android?: {
      setUserId: (userId: string) => void;
      clearUserId: () => void;
      getFcmToken: () => string;
    };
  }
}
import Toast, { type ToastMessage } from "./components/Toast";
import { 
  Plus, 
  Trash2, 
  Cake,
  Bell,
  LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import AuthModal from "./components/AuthModal";
import CalendarSection from "./components/CalendarSection";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"link" | "switch" | "reset" | "update_password">("link");
  const [showConflictResolution, setShowConflictResolution] = useState(false);
  
  // Auth state
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          await supabase.auth.signOut();
        } else {
          setUser(user);
          window.Android?.setUserId(user.id);
          setLoading(false);
          return;
        }
      }

      const { data } = await supabase.auth.signInAnonymously();
      if (data.user) {
        setUser(data.user);
        window.Android?.setUserId(data.user.id);
      }
      setLoading(false);
    };

    initAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        window.Android?.setUserId(session.user.id);
      } else {
        window.Android?.clearUserId();
      }
      
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode("update_password");
        setIsAuthModalOpen(true);
      }

      if (!session) {
        const { data } = await supabase.auth.signInAnonymously();
        if (data.user) {
          setUser(data.user);
          window.Android?.setUserId(data.user.id);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle deep links via browser navigation
  useEffect(() => {
    const handleAuthLink = async () => {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(url.hash.substring(1));
      const searchParams = new URLSearchParams(url.search);
      
      const accessToken = hashParams.get("access_token") || searchParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token") || searchParams.get("refresh_token");

      if (accessToken && refreshToken) {
        setLoading(true);
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (!error) {
          addToast("Account confirmed! Welcome.", "success");
        } else {
          addToast("Confirmation error: " + error.message, "error");
        }
        setLoading(false);
      }
    };

    handleAuthLink();
  }, []);

  // Fetch birthdays
  useEffect(() => {
    if (!user) return;
    
    const fetchBirthdays = async () => {
      const { data } = await supabase
        .from("birthdays")
        .select("*")
        .order("birth_date", { ascending: true });
      if (data) {
          setBirthdays(data);
      }
      
      // Save FCM token to database (retry if not immediately available)
      if (window.Android && window.Android.getFcmToken) {
          let attempts = 0;
          const tryGetToken = async () => {
              if (!window.Android) return;
              const token = window.Android.getFcmToken();
              if (token) {
                  console.log("Got FCM Token, saving to Supabase...");
                  await supabase.from('fcm_tokens').upsert({
                      user_id: user.id,
                      token: token,
                      updated_at: new Date().toISOString()
                  });
              } else if (attempts < 10) {
                  attempts++;
                  setTimeout(tryGetToken, 1000); // Try again in 1 second
              }
          };
          tryGetToken();
      }
    };

    fetchBirthdays();
  }, [user]);

  // Enriched birthdays
  const enrichedBirthdays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return birthdays.map(b => {
      const parts = b.birth_date.split('-').map(Number);
      const bMonth = parts[1] - 1;
      const bDay = parts[2];
      
      let nextDate = new Date(today.getFullYear(), bMonth, bDay);
      if (nextDate < today) {
        nextDate.setFullYear(today.getFullYear() + 1);
      }

      const diffTime = nextDate.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isToday = today.getMonth() === bMonth && today.getDate() === bDay;

      return { ...b, daysLeft, isToday, nextDate };
    }).sort((a, b) => a.daysLeft - b.daysLeft);
  }, [birthdays]);

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");

  const addBirthday = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      addToast("Please enter a name", "error");
      return;
    }
    if (name.length > 50) {
      addToast("Name too long (max 50 chars)", "error");
      return;
    }
    if (!newDate || !user) return;

    const { data, error } = await supabase
      .from("birthdays")
      .insert([{ name, birth_date: newDate, user_id: user.id }])
      .select();

    if (error) {
      addToast("Error saving: " + error.message, "error");
      return;
    }

    if (data) {
      setBirthdays([...birthdays, data[0]]);
      setNewName("");
      setNewDate("");
      setIsAdding(false);
      addToast("Birthday added! 🎉");
    }
  };

  const deleteBirthday = async (id: string) => {
    const { error } = await supabase
      .from("birthdays")
      .delete()
      .eq("id", id);
    if (!error) {
      setBirthdays(birthdays.filter(b => b.id !== id));
      addToast("Birthday deleted", "info");
    } else {
      addToast("Delete failed: " + error.message, "error");
    }
  };

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (authMode === "reset") {
      if (!authEmail) return;
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
        redirectTo: "com.birthdayapp://reset-password"
      });
      setLoading(false);
      if (error) {
        addToast("Reset failed: " + error.message, "error");
      } else {
        addToast("Password reset link sent! Check email.", "success");
        setIsAuthModalOpen(false);
      }
      return;
    }

    if (authMode === "update_password") {
      if (!authPassword) return;
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: authPassword });
      setLoading(false);
      if (error) {
        addToast("Update failed: " + error.message, "error");
      } else {
        addToast("Password updated!", "success");
        setAuthPassword("");
        setIsAuthModalOpen(false);
        setAuthMode("switch");
      }
      return;
    }

    if (!authEmail || !authPassword) return;

    if (authMode === "link") {
      const { error } = await supabase.auth.updateUser(
        { email: authEmail, password: authPassword },
        { emailRedirectTo: "com.birthdayapp://confirm" }
      );
      if (error) {
        const isRegisteredError = 
          error.message.toLowerCase().includes("already registered") || 
          error.message.toLowerCase().includes("email exists") ||
          error.status === 422;

        if (isRegisteredError) {
          if (birthdays.length > 0) {
            setShowConflictResolution(true);
          } else {
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: authEmail,
              password: authPassword
            });
            if (signInError) {
              addToast("Sign in failed: " + signInError.message, "error");
            } else {
              setAuthPassword("");
              addToast("Welcome back!", "success");
              setIsAuthModalOpen(false);
            }
          }
        } else {
          addToast("Linking failed: " + error.message, "error");
        }
      } else {
        setAuthPassword("");
        addToast("Link initiated! Check email.", "info");
        setIsAuthModalOpen(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) {
        addToast("Sign in failed: " + error.message, "error");
      } else {
        setAuthPassword("");
        addToast("Welcome back!", "success");
        setIsAuthModalOpen(false);
      }
    }
  };

  const handleResolutionChoice = async (choice: 'merge' | 'discard') => {
    if (birthdays.length === 0) {
      setLoading(true);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword
      });

      if (signInError) {
        addToast("Login failed: " + signInError.message, "error");
      } else {
        setAuthPassword("");
        addToast("Welcome back!", "success");
        setShowConflictResolution(false);
        setIsAuthModalOpen(false);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    const guestData = choice === 'merge' ? [...birthdays] : [];
    
    const { data: { user: newUser }, error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword
    });

    if (signInError) {
      addToast("Login failed: " + signInError.message, "error");
      setLoading(false);
      return;
    }

    if (choice === 'merge' && guestData.length > 0 && newUser) {
      addToast("Merging your birthdays...", "info");
      const birthdaysToInsert = guestData.map(b => ({
        name: b.name,
        birth_date: b.birth_date,
        user_id: newUser.id
      }));

      const { error: mergeError } = await supabase.from('birthdays').insert(birthdaysToInsert);
      if (mergeError) {
        addToast("Merge failed: " + mergeError.message, "error");
        setLoading(false);
        return;
      } else {
        addToast("Data merged! 🎉", "success");
      }
    } else if (choice === 'discard') {
      addToast("Guest data discarded.", "info");
    }

    setAuthPassword("");
    setShowConflictResolution(false);
    setIsAuthModalOpen(false);
    setLoading(false);
  };

  const handleLogout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      addToast("Logout failed: " + error.message, "error");
    } else {
      setBirthdays([]);
      addToast("Logged out!", "info");
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-bg-color">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-2 sm:px-4 py-8 space-y-8">
      <header className="text-center space-y-2">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent px-2"
        >
          Birthday Scheduler
        </motion.h1>
        <p className="text-sm sm:text-base text-text-muted">Stay connected with your loved ones</p>
      </header>

      <AnimatePresence>
        {enrichedBirthdays.some(b => b.isToday) && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-accent/20 border border-accent rounded-2xl p-6 flex items-center gap-4 text-accent"
          >
            <Bell className="w-8 h-8 animate-bounce" />
            <div>
              <h2 className="text-xl font-bold">Birthday Today!</h2>
              <p className="text-sm opacity-90">
                Don't forget to wish {enrichedBirthdays.filter(b => b.isToday).map(b => b.name).join(", ")} a happy birthday!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-2 overflow-hidden">
        <h2 className="text-base sm:text-xl font-semibold flex items-center gap-2 truncate">
          <Cake className="w-5 h-5 text-primary shrink-0" />
          <span className="truncate">
            <span className="hidden xs:inline">Upcoming</span> Birthdays
          </span>
        </h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-primary hover:bg-primary-hover text-white px-2 py-1.5 sm:px-4 sm:py-2 text-[12px] sm:text-base rounded-xl flex items-center gap-1.5 transition-colors shadow-lg shadow-primary/20 shrink-0 whitespace-nowrap"
        >
          <Plus className="w-3 h-3 sm:w-4 h-4" /> 
          <span>Add<span className="hidden xs:inline"> New</span></span>
        </button>
      </div>

      <div className="grid gap-4">
        {enrichedBirthdays.map((b) => (
          <motion.div 
            layout
            key={b.id}
            className={cn(
              "p-4 rounded-2xl border transition-all hover:translate-x-1",
              b.isToday ? "bg-accent/10 border-accent" : "bg-card-bg border-border-color"
            )}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">{b.name}</h3>
                <p className="text-sm text-text-muted">
                  {new Date(b.birth_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', timeZone: 'UTC' })}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className={cn(
                    "font-bold block",
                    b.isToday ? "text-accent" : "text-primary"
                  )}>
                    {b.isToday ? "Today!" : `In ${b.daysLeft} days`}
                  </span>
                </div>
                <button 
                  onClick={() => deleteBirthday(b.id)}
                  className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        {birthdays.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-border-color rounded-2xl text-text-muted">
            No birthdays saved yet.
          </div>
        )}
      </div>

      <CalendarSection 
        month={month}
        year={year}
        monthNames={monthNames}
        prevMonth={prevMonth}
        nextMonth={nextMonth}
        firstDay={firstDay}
        daysInMonth={daysInMonth}
        birthdays={birthdays}
      />

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-card-bg border border-border-color rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6">Add Birthday</h2>
              <form onSubmit={addBirthday} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-muted">Person's Name</label>
                  <input 
                    autoFocus
                    required
                    type="text" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full bg-bg-color border border-border-color rounded-xl px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-muted">Birthdate</label>
                  <input 
                    required
                    type="date" 
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-bg-color border border-border-color rounded-xl px-4 py-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-border-color hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary-hover text-white px-4 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20"
                  >
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <footer className="flex flex-col items-center gap-4 pb-12 pt-4">
        <div className="w-full flex justify-between items-center text-[10px] text-text-muted px-2">
          <p className="italic opacity-50">Local-first sync with Supabase Cloud</p>
          <button 
            onClick={() => {
              setAuthMode(user?.email ? "switch" : "link");
              setIsAuthModalOpen(true);
            }}
            className="text-primary hover:underline font-medium"
          >
            {user?.email ? "Switch email account" : "Link email account"}
          </button>
        </div>
        {user?.email && (
          <div className="flex items-center gap-2 group">
            <p className="text-[10px] text-accent opacity-80">Logged in as: {user.email}</p>
            <button 
              onClick={handleLogout}
              className="p-1 px-2 rounded-lg bg-white/5 border border-border-color hover:bg-red-400/10 hover:border-red-400/30 text-text-muted hover:text-red-400 transition-all flex items-center gap-1.5"
              title="Log out"
            >
              <LogOut className="w-3 h-3" />
              <span className="text-[10px] font-medium">Logout</span>
            </button>
          </div>
        )}
      </footer>

      <AuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        authMode={authMode}
        setAuthMode={setAuthMode}
        handleAuthAction={handleAuthAction}
        showConflictResolution={showConflictResolution}
        setShowConflictResolution={setShowConflictResolution}
        birthdaysCount={birthdays.length}
        handleResolutionChoice={handleResolutionChoice}
      />

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
