import { User, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogOut, Box, Terminal, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 border-b border-[#333] bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <Box className="text-[#00ff00]" size={24} />
          <span className="font-mono text-lg font-bold tracking-tighter uppercase">
            AR_PORTAL
          </span>
        </div>

        <div className="flex items-center gap-6">
          {user ? (
            <>
              <div className="hidden items-center gap-2 font-mono text-xs text-gray-500 md:flex">
                <Terminal size={14} />
                <span>USER: {user.email || 'ANONYMOUS'}</span>
              </div>
              
              <button
                onClick={() => signOut(auth)}
                className="group flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-gray-400 transition-colors hover:text-[#00ff00]"
              >
                <LogOut size={16} className="transition-transform group-hover:translate-x-1" />
                LOGOUT
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="group flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#00ff00] transition-colors hover:text-white"
            >
              <LogIn size={16} />
              SIGN_IN
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
