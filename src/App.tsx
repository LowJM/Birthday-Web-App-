import { useEffect, useState, useMemo, useRef } from "react";
import { supabase, type Birthday } from "./lib/supabase";
import { LocalNotifications } from "@capacitor/local-notifications";
import { App as CapApp } from "@capacitor/app";
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
  const lastScheduledHash = useRef<string>("");
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
        // Validate the session token with the server
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          // The user was likely deleted from the Supabase dashboard but the JWT remains on the device.
          // Force sign out to clear the stale local session.
          await supabase.auth.signOut();
        } else {
          setUser(user);
          setLoading(false);
          return;
        }
      }

      // If no valid session exists, create a new anonymous guest session
      const { data } = await supabase.auth.signInAnonymously();
      if (data.user) setUser(data.user);
      
      setLoading(false);
    };

    initAuth();
    
    // Listen for auth changes (including sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode("update_password");
        setIsAuthModalOpen(true);
      }

      // Zero-downtime Guest Recovery:
      // If the user logs out (session becomes null), instantly restore guest access.
      if (!session) {
        const { data } = await supabase.auth.signInAnonymously();
        if (data.user) setUser(data.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle Deep Links (Email Confirmation)
  useEffect(() => {
    const handleAction = async (event: { url: string }) => {
      const url = new URL(event.url);
      
      // Check both hash (#) and search (?) for tokens
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

    const setupListener = async () => {
      const handle = await CapApp.addListener("appUrlOpen", handleAction);
      return handle;
    };

    const listenerPromise = setupListener();

    return () => {
      listenerPromise.then(handle => handle.remove());
    };
  }, []);

  // Fetch birthdays
  useEffect(() => {
    if (!user) return;
    
    const fetchBirthdays = async () => {
      const { data } = await supabase
        .from("birthdays")
        .select("*")
        .order("birth_date", { ascending: true });
      if (data) setBirthdays(data);
    };

    fetchBirthdays();
  }, [user]);

  // Enriched birthdays logic
  const enrichedBirthdays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return birthdays.map(b => {
      // Manual parsing to avoid timezone-shifting (ISO 8601 YYYY-MM-DD)
      const parts = b.birth_date.split('-').map(Number);
      const bMonth = parts[1] - 1; // 0-indexed
      const bDay = parts[2];
      
      let nextDate = new Date(today.getFullYear(), bMonth, bDay);
      
      if (nextDate < today) {
        nextDate.setFullYear(today.getFullYear() + 1);
      }

      const diffTime = nextDate.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isToday = today.getMonth() === bMonth && today.getDate() === bDay;

      // Calculate when to actually trigger the notification
      let scheduleDate = new Date(nextDate);
      scheduleDate.setHours(9, 0, 0, 0); // 9:00 AM local time
      
      // If today is their birthday and 9 AM has already passed, schedule for next year
      // This prevents the bug where opening the app fires a past notification immediately
      if (scheduleDate.getTime() <= Date.now()) {
        scheduleDate.setFullYear(scheduleDate.getFullYear() + 1);
      }

      return { ...b, daysLeft, isToday, nextDate, scheduleDate };
    }).sort((a, b) => a.daysLeft - b.daysLeft);
  }, [birthdays]);

  // Request notification permissions
  useEffect(() => {
    LocalNotifications.requestPermissions();
  }, []);

  // Sync notifications with birthdays
  useEffect(() => {
    if (enrichedBirthdays.length === 0) return;

    // Avoid redundant scheduling if the birthdays haven't changed
    const currentHash = JSON.stringify(enrichedBirthdays.map(b => ({ id: b.id, next: b.scheduleDate.getTime() })));
    if (currentHash === lastScheduledHash.current) return;
    lastScheduledHash.current = currentHash;

    const scheduleNotifications = async () => {
      await LocalNotifications.cancel({ notifications: await (await LocalNotifications.getPending()).notifications });
      
      const notifications = enrichedBirthdays
        .filter(b => b.daysLeft >= 0)
        .slice(0, 50) // Capacitor limits
        .map(b => ({
          title: "Birthday Reminder! 🎉",
          body: `It's ${b.name}'s birthday today!`,
          id: parseInt(b.id.slice(-8), 16) || Math.floor(Math.random() * 100000), // convert uuid suffix to int
          schedule: { at: b.scheduleDate, allowWhileIdle: true },
          sound: "res://raw/notification_sound", // optional
          actionTypeId: "",
          extra: null
        }));

      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
      }
    };

    scheduleNotifications();
  }, [enrichedBirthdays]);

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
      addToast("Name is too long (max 50 chars)", "error");
      return;
    }
    if (!newDate || !user) return;

    const { data, error } = await supabase
      .from("birthdays")
      .insert([{ name, birth_date: newDate, user_id: user.id }])
      .select();

    if (error) {
      console.error("Save Error:", error);
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
      const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
        redirectTo: "http://localhost:3000" // Web testing default
      });
      if (error) {
        addToast("Reset failed: " + error.message, "error");
      } else {
        addToast("Password reset link sent! Check your email.", "success");
        setIsAuthModalOpen(false);
      }
      return;
    }

    if (authMode === "update_password") {
      if (!authPassword) return;
      const { error } = await supabase.auth.updateUser({ password: authPassword });
      if (error) {
        addToast("Update failed: " + error.message, "error");
      } else {
        addToast("Password updated successfully!", "success");
        setAuthPassword("");
        setIsAuthModalOpen(false);
        setAuthMode("switch"); // reset mode
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
          error.message.toLowerCase().includes("already been registered") ||
          error.message.toLowerCase().includes("email exists") ||
          error.status === 422;

        if (isRegisteredError) {
          if (birthdays.length > 0) {
            setShowConflictResolution(true);
          } else {
            // No data to merge, just sign in
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: authEmail,
              password: authPassword
            });
            if (signInError) {
              addToast("Sign in failed: " + signInError.message, "error");
            } else {
              setAuthPassword(""); // Security: Clear password
              addToast("Welcome back!", "success");
              setIsAuthModalOpen(false);
            }
          }
        } else {
          addToast("Linking failed: " + error.message, "error");
        }
      } else {
        setAuthPassword(""); // Security: Clear password
        addToast("Link initiated! Check your email.", "info");
        setIsAuthModalOpen(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) {
        addToast("Sign in failed: " + error.message, "error");
      } else {
        setAuthPassword(""); // Security: Clear password
        addToast("Welcome back!", "success");
        setIsAuthModalOpen(false);
      }
    }
  };

  const handleResolutionChoice = async (choice: 'merge' | 'discard') => {
    // Merge Guard: If there's no data to merge, bypass the process but log in
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
    
    // 1. Store guest data if merging
    const guestData = choice === 'merge' ? [...birthdays] : [];
    
    // 2. Sign in to existing account
    const { data: { user: newUser }, error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword
    });

    if (signInError) {
      addToast("Login failed: " + signInError.message, "error");
      setLoading(false);
      // We DON'T close the modal here so the user can try again
      return;
    }

    // 3. If merge, upload guest data to new user ID
    if (choice === 'merge' && guestData.length > 0 && newUser) {
      addToast("Merging your birthdays...", "info");
      const birthdaysToInsert = guestData.map(b => ({
        name: b.name,
        birth_date: b.birth_date,
        user_id: newUser.id
      }));

      const { error: mergeError } = await supabase.from('birthdays').insert(birthdaysToInsert);
      if (mergeError) {
        addToast("Merge partial failure: " + mergeError.message, "error");
        // We stay in the modal if the merge failed so user can see/retry if needed
        setLoading(false);
        return;
      } else {
        addToast("Data merged successfully! 🎉", "success");
      }
    } else if (choice === 'discard') {
      addToast("Welcome back! Guest data discarded.", "info");
    }

    setAuthPassword(""); // Security: Clear password
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
      addToast("Logged out! Using as Guest.", "info");
    }
    setLoading(false);
  };

  // Enriched birthdays logic

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-bg-color">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-2 sm:px-4 py-8 space-y-8">
      {/* Header */}
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

      {/* Stats/Reminder Card */}
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

      {/* Main Actions */}
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

      {/* Birthday List */}
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

      {/* Calendar Section */}
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

      {/* Add Modal */}
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
