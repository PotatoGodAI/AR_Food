import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, QrCode, ExternalLink, Box, Terminal, Copy, Check } from 'lucide-react';
import UploadModal from './UploadModal';
import { QRCodeSVG } from 'qrcode.react';

interface Model {
  id: string;
  name: string;
  glbUrl: string;
  usdzUrl?: string;
  createdAt: string;
  userId: string;
}

export default function Dashboard({ user }: { user: User | null }) {
  console.log('DASHBOARD_RENDERED', { userId: user?.uid });
  const [models, setModels] = useState<Model[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const path = 'models';
    const q = user 
      ? query(
          collection(db, path),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        )
      : query(
          collection(db, path),
          orderBy('createdAt', 'desc')
        );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const modelData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Model[];
      setModels(modelData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleDelete = async (id: string) => {
    if (confirm('DESTRUCTIVE_ACTION: CONFIRM_ASSET_DELETION?')) {
      const path = `models/${id}`;
      try {
        await deleteDoc(doc(db, 'models', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  };

  const copyToClipboard = (id: string) => {
    const url = `${window.location.origin}/view/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h2 className="font-mono text-4xl font-black tracking-tighter uppercase">
            {user ? 'MY_ASSETS' : 'PUBLIC_GALLERY'}
          </h2>
          <p className="mt-2 font-mono text-xs text-gray-500 uppercase tracking-widest">
            {user ? `ACTIVE_SESSION: ${user.uid.slice(0, 8)}...` : 'GUEST_ACCESS_ENABLED'}
          </p>
        </div>
        
        {user ? (
          <button
            onClick={() => {
              console.log('INITIALIZE_UPLOAD_CLICKED');
              setIsUploadOpen(true);
            }}
            className="brutalist-button flex items-center gap-2 bg-[#00ff00] px-8 py-3 text-black hover:bg-[#00cc00]"
          >
            <Plus size={20} />
            INITIALIZE_UPLOAD
          </button>
        ) : (
          <a
            href="/login"
            className="brutalist-button flex items-center gap-2 bg-[#00ff00] px-8 py-3 text-black hover:bg-[#00cc00]"
          >
            <Plus size={20} />
            SIGN_IN_TO_UPLOAD
          </a>
        )}
      </div>

      {models.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center border border-dashed border-[#333] bg-[#0a0a0a]">
          <Box size={48} className="mb-4 text-gray-700" />
          <p className="font-mono text-sm text-gray-500 uppercase tracking-widest">
            NO_ASSETS_DETECTED_IN_DATABASE
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {models.map((model) => (
              <motion.div
                key={model.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="brutalist-card group relative flex min-h-[320px] flex-col overflow-hidden"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center border border-[#333] bg-black text-[#00ff00]">
                    <Box size={24} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedQR(model.id)}
                      className="p-2 text-gray-500 transition-colors hover:text-[#00ff00]"
                      title="GENERATE_QR"
                    >
                      <QrCode size={18} />
                    </button>
                    {user && user.uid === model.userId && (
                      <button
                        onClick={() => handleDelete(model.id)}
                        className="p-2 text-gray-500 transition-colors hover:text-red-500"
                        title="DELETE_ASSET"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="mb-1 font-mono text-lg font-bold uppercase tracking-tight">
                  {model.name}
                </h3>
                <p className="mb-6 font-mono text-[10px] text-gray-500 uppercase">
                  ID: {model.id} | CREATED: {new Date(model.createdAt).toLocaleDateString()}
                </p>

                <div className="flex gap-2">
                  <a
                    href={`/view/${model.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="brutalist-button flex flex-1 items-center justify-center gap-2 py-2 text-xs"
                  >
                    <ExternalLink size={14} />
                    VIEW_AR
                  </a>
                  <button
                    onClick={() => copyToClipboard(model.id)}
                    className="brutalist-button flex items-center justify-center p-2"
                    title="COPY_LINK"
                  >
                    {copiedId === model.id ? <Check size={14} className="text-[#00ff00]" /> : <Copy size={14} />}
                  </button>
                </div>

                {/* QR Overlay */}
                <AnimatePresence>
                  {selectedQR === model.id && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/98 p-6 backdrop-blur-md"
                    >
                      <div className="mb-4 flex flex-col items-center justify-center border-2 border-white bg-white p-3 shadow-[8px_8px_0px_rgba(0,255,0,0.5)]">
                        <QRCodeSVG
                          value={`${window.location.origin}/view/${model.id}`}
                          size={160}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                      <p className="mb-6 font-mono text-[10px] text-center text-[#00ff00] uppercase tracking-widest animate-pulse">
                        SCAN_TO_OPEN_PORTAL
                      </p>
                      <button
                        onClick={() => setSelectedQR(null)}
                        className="brutalist-button w-full py-2 text-xs font-bold"
                      >
                        CLOSE_ENCRYPTION
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {user && (
        <UploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          userId={user.uid}
        />
      )}
    </div>
  );
}
