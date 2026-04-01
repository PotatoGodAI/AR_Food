import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import Dashboard from './components/Dashboard';
import ARViewer from './components/ARViewer';
import Login from './components/Login';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('AUTH_STATE_CHANGED', { user: user?.uid });
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black font-mono text-[#00ff00]">
        <motion.div
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          INITIALIZING_SYSTEM...
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-black text-white selection:bg-[#00ff00] selection:text-black">
          <div className="scanline" />
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/view/:modelId" element={<ARViewer />} />
              <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
              <Route
                path="/"
                element={
                  <>
                    <Navbar user={user} />
                    <Dashboard user={user} />
                  </>
                }
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </AnimatePresence>
        </div>
      </Router>
    </ErrorBoundary>
  );
}
