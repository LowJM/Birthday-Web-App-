import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  authEmail: string;
  setAuthEmail: (email: string) => void;
  authPassword: string;
  setAuthPassword: (pass: string) => void;
  authMode: "link" | "switch" | "reset" | "update_password";
  setAuthMode: (mode: "link" | "switch" | "reset" | "update_password") => void;
  handleAuthAction: (e: React.FormEvent) => void;
  showConflictResolution: boolean;
  setShowConflictResolution: (show: boolean) => void;
  birthdaysCount: number;
  handleResolutionChoice: (choice: 'merge' | 'discard') => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authMode,
  setAuthMode,
  handleAuthAction,
  showConflictResolution,
  setShowConflictResolution,
  birthdaysCount,
  handleResolutionChoice
}: AuthModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-[#1A1A2E] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl"
          >
            {!showConflictResolution ? (
              <>
                <h2 className="text-2xl font-bold mb-2">
                  {authMode === "link" ? "Link Email Account" : authMode === "switch" ? "Switch Account" : authMode === "reset" ? "Reset Password" : "Set New Password"}
                </h2>
                <p className="text-sm text-gray-400 mb-6">
                  {authMode === "link" 
                    ? "Connect an email to secure your data and access it from any device."
                    : authMode === "switch"
                    ? "Sign in with an existing email to fetch your saved birthdays."
                    : authMode === "reset"
                    ? "Enter your email to receive a password reset link."
                    : "Enter a new password for your account."}
                </p>
                
                <form onSubmit={handleAuthAction} className="space-y-4">
                  {authMode !== "update_password" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400">Email Address</label>
                      <input 
                        required
                        type="email" 
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-[#0F0F1E] border border-white/10 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-white"
                      />
                    </div>
                  )}
                  {authMode !== "reset" && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400">
                        {authMode === "update_password" ? "New Password" : "Password"}
                      </label>
                      <input 
                        required
                        type="password" 
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full bg-[#0F0F1E] border border-white/10 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-white"
                      />
                    </div>
                  )}

                  {(authMode === "link" || authMode === "switch") && (
                    <div className="text-right">
                      <button 
                        type="button" 
                        onClick={() => setAuthMode("reset")} 
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  )}

                  {authMode === "reset" && (
                    <div className="text-right">
                      <button 
                        type="button" 
                        onClick={() => setAuthMode("link")} 
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        Back to Login
                      </button>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-white"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                    >
                      {authMode === "link" ? "Link Account" : authMode === "switch" ? "Sign In" : authMode === "reset" ? "Send Link" : "Update Password"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="space-y-6 text-white">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center">
                    <Bell className="w-8 h-8 text-pink-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Email Already Registered</h2>
                    <p className="text-sm text-gray-400 mt-2">
                      This email already has an account. Since you have <strong>{birthdaysCount}</strong> birthdays in your current guest list, what would you like to do?
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => handleResolutionChoice('merge')}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-2xl font-bold flex flex-col items-center transition-all"
                  >
                    <span>Merge & Login</span>
                    <span className="text-[10px] opacity-80 font-normal">Add guest birthdays to the email account</span>
                  </button>
                  
                  <button 
                    onClick={() => handleResolutionChoice('discard')}
                    className="w-full border border-white/10 hover:bg-white/5 text-white p-4 rounded-2xl font-bold flex flex-col items-center transition-all"
                  >
                    <span>Discard & Login</span>
                    <span className="text-[10px] text-gray-400 font-normal">Use only birthdays from the email account</span>
                  </button>

                  <button 
                    onClick={() => {
                      setShowConflictResolution(false);
                      onClose();
                    }}
                    className="w-full text-gray-400 text-sm py-2 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
