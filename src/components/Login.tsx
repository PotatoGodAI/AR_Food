import { signInWithPopup, signInAnonymously } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { motion } from 'motion/react';
import { LogIn, Box, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleGuestLogin = async () => {
    try {
      await signInAnonymously(auth);
      navigate('/');
    } catch (error) {
      console.error('Guest login failed:', error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="brutalist-card w-full max-w-md text-center"
      >
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <Box size={64} className="text-[#00ff00]" />
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -inset-2 rounded-full border border-[#00ff00]/30 blur-sm"
            />
          </div>
        </div>
        
        <h1 className="mb-2 font-mono text-3xl font-bold tracking-tighter uppercase">
          AR_PORTAL_ENGINE
        </h1>
        <p className="mb-8 font-mono text-sm text-gray-500">
          DEPLOY_3D_ASSETS_TO_REALITY_V1.0
        </p>

        <div className="space-y-4">
          <button
            onClick={handleLogin}
            className="brutalist-button flex w-full items-center justify-center gap-3 py-4 text-lg"
          >
            <LogIn size={20} />
            AUTHENTICATE_WITH_GOOGLE
          </button>

          <button
            onClick={handleGuestLogin}
            className="brutalist-button flex w-full items-center justify-center gap-3 border-[#333] bg-transparent py-4 text-lg text-gray-400 hover:text-[#00ff00]"
          >
            <UserCircle size={20} />
            CONTINUE_AS_GUEST
          </button>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-2 opacity-20">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-1 bg-[#00ff00]" />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
