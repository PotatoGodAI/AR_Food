import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, FileCode, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { storage, db, handleFirestoreError, OperationType } from '../lib/firebase';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function UploadModal({ isOpen, onClose, userId }: UploadModalProps) {
  console.log('UPLOAD_MODAL_RENDERED', { isOpen, userId });
  const [name, setName] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'manual'>('file');
  const [manualGlbUrl, setManualGlbUrl] = useState('');
  const [manualUsdzUrl, setManualUsdzUrl] = useState('');

  const convertDriveLink = (url: string) => {
    if (url.includes('drive.google.com')) {
      const match = url.match(/\/d\/(.+?)\/(view|edit|usp=sharing)?/);
      if (match && match[1]) {
        return `https://drive.google.com/uc?export=download&id=${match[1]}`;
      }
    }
    return url;
  };
  const [glbFile, setGlbFile] = useState<File | null>(null);
  const [usdzFile, setUsdzFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCorsHelp, setShowCorsHelp] = useState(false);
  const [success, setSuccess] = useState(false);

  const glbInputRef = useRef<HTMLInputElement>(null);
  const usdzInputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => {
    console.log(`[SYSTEM_LOG] ${msg}`);
    setSystemLogs(prev => [msg, ...prev].slice(0, 5));
    setStatus(msg);
  };

  useEffect(() => {
    console.log('UPLOAD_MODAL_MOUNTED');
    return () => console.log('UPLOAD_MODAL_UNMOUNTED');
  }, []);

  // Debug state changes
  useEffect(() => {
    if (isOpen) {
      console.log('UPLOAD_MODAL_STATE_UPDATE:', { 
        name, 
        hasGlb: !!glbFile, 
        hasUsdz: !!usdzFile, 
        uploading,
        userId 
      });
    }
  }, [name, glbFile, usdzFile, uploading, isOpen, userId]);

  const handleClose = () => {
    console.log('UPLOAD_MODAL_CLOSE_REQUESTED');
    onClose();
  };

  const handleUpload = async () => {
    console.log('--- EXECUTE_DEPLOYMENT_TRIGGERED ---');
    
    const hasAsset = uploadMode === 'file' ? (glbFile || usdzFile) : (manualGlbUrl || manualUsdzUrl);
    if (!name || !hasAsset) {
      console.error('VALIDATION_ERROR: Missing required fields', { name, uploadMode, hasGlb: !!glbFile, hasUsdz: !!usdzFile, hasManualGlb: !!manualGlbUrl, hasManualUsdz: !!manualUsdzUrl });
      setError('REQUIRED_FIELD_MISSING: NAME AND AT LEAST ONE ASSET (GLB OR USDZ) ARE MANDATORY');
      return;
    }

    console.log('ASSET_NAME:', name);
    if (glbFile) console.log('GLB_FILE:', glbFile.name, `(${glbFile.size} bytes)`);
    if (usdzFile) console.log('USDZ_FILE:', usdzFile.name, `(${usdzFile.size} bytes)`);

    setUploading(true);
    setSuccess(false);
    setShowCorsHelp(false);
    setProgress(0);
    setError(null);
    setSystemLogs([]);
    addLog('INITIALIZING_STREAMS...');

    try {
      let glbUrl = manualGlbUrl;
      let usdzUrl = manualUsdzUrl;

      if (uploadMode === 'file') {
        // 1. Upload GLB if exists
        if (glbFile) {
          const glbPath = `models/${userId}/${Date.now()}_${glbFile.name}`;
          const glbRef = ref(storage, glbPath);
          
          addLog('UPLOADING_GLB_ASSET...');
          
          const glbTask = uploadBytesResumable(glbRef, glbFile);
          
          const timeout = setTimeout(() => {
            glbTask.cancel();
            setError('SYSTEM_FAILURE: UPLOAD_TIMEOUT (CORS_ISSUE)');
            setShowCorsHelp(true);
            setUploading(false);
          }, 30000);

          glbTask.on('state_changed', (snapshot) => {
            setProgress((snapshot.bytesTransferred / snapshot.totalBytes) * (usdzFile ? 45 : 90));
          });

          await glbTask;
          clearTimeout(timeout);
          glbUrl = await getDownloadURL(glbRef);
        }

        // 2. Upload USDZ if exists
        if (usdzFile) {
          const usdzPath = `models/${userId}/${Date.now()}_${usdzFile.name}`;
          const usdzRef = ref(storage, usdzPath);
          addLog('UPLOADING_USDZ_ASSET...');
          const usdzTask = uploadBytesResumable(usdzRef, usdzFile);
          const startP = glbFile ? 45 : 0;
          usdzTask.on('state_changed', (snapshot) => {
            setProgress(startP + (snapshot.bytesTransferred / snapshot.totalBytes) * (glbFile ? 45 : 90));
          });
          await usdzTask;
          usdzUrl = await getDownloadURL(usdzRef);
        }
      }

      addLog('FINALIZING_METADATA...');
      setProgress(95);
      
      // 3. Save to Firestore
      const path = 'models';
      addLog('SAVING_TO_FIRESTORE...');
      const payload = {
        name,
        glbUrl: glbUrl || null,
        usdzUrl: usdzUrl || null,
        userId,
        createdAt: new Date().toISOString(),
      };
      console.log('FIRESTORE_PAYLOAD:', payload);
      try {
        await addDoc(collection(db, path), payload);
        addLog('FIRESTORE_SAVE_SUCCESS');
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }

      setProgress(100);
      addLog('DEPLOYMENT_SUCCESSFUL');
      setSuccess(true);
      
      setTimeout(() => {
        setUploading(false);
        onClose();
        setName('');
        setGlbFile(null);
        setUsdzFile(null);
        setStatus(null);
        setSuccess(false);
      }, 2000);

    } catch (err: any) {
      console.error('CRITICAL_UPLOAD_FAILURE:', err);
      const isCors = err.message?.includes('access-control') || err.code === 'storage/retry-limit-exceeded';
      setError(isCors ? 'SECURITY_BLOCK: CORS_POLICY_REJECTED_UPLOAD' : `SYSTEM_FAILURE: ${err.message || 'UNKNOWN_ERROR'}`);
      if (isCors) setShowCorsHelp(true);
      setUploading(false);
      setStatus(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={handleClose}
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="brutalist-card relative z-10 w-full max-w-xl"
      >
        <div className="mb-8 flex items-center justify-between">
          <h3 className="font-mono text-2xl font-bold uppercase tracking-tighter">
            INITIALIZE_ASSET_UPLOAD
          </h3>
          <button onClick={handleClose} className="text-gray-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex border-b border-[#333]">
            <button
              onClick={() => setUploadMode('file')}
              className={`flex-1 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                uploadMode === 'file' ? 'bg-[#00ff00] text-black' : 'text-gray-500 hover:text-white'
              }`}
            >
              FILE_UPLOAD
            </button>
            <button
              onClick={() => setUploadMode('manual')}
              className={`flex-1 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                uploadMode === 'manual' ? 'bg-[#00ff00] text-black' : 'text-gray-500 hover:text-white'
              }`}
            >
              MANUAL_LINK
            </button>
          </div>

          <div>
            <label className="mb-2 block font-mono text-xs text-gray-500 uppercase tracking-widest">
              ASSET_NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ENTER_MODEL_IDENTIFIER..."
              className="brutalist-input"
              disabled={uploading}
            />
          </div>

          {uploadMode === 'file' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div
                onClick={() => !uploading && glbInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center border-2 border-dashed p-6 transition-all ${
                  glbFile ? 'border-[#00ff00] bg-[#00ff00]/5' : 'border-[#333] hover:border-gray-500'
                }`}
              >
                <input
                  type="file"
                  ref={glbInputRef}
                  onChange={(e) => setGlbFile(e.target.files?.[0] || null)}
                  accept=".glb"
                  className="hidden"
                />
                <FileCode size={32} className={glbFile ? 'text-[#00ff00]' : 'text-gray-500'} />
                <span className="mt-2 font-mono text-[10px] uppercase tracking-widest text-center">
                  {glbFile ? glbFile.name : 'SELECT_.GLB_FILE'}
                </span>
              </div>

              <div
                onClick={() => !uploading && usdzInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center border-2 border-dashed p-6 transition-all ${
                  usdzFile ? 'border-[#00ff00] bg-[#00ff00]/5' : 'border-[#333] hover:border-gray-500'
                }`}
              >
                <input
                  type="file"
                  ref={usdzInputRef}
                  onChange={(e) => setUsdzFile(e.target.files?.[0] || null)}
                  accept=".usdz"
                  className="hidden"
                />
                <FileCode size={32} className={usdzFile ? 'text-[#00ff00]' : 'text-gray-500'} />
                <span className="mt-2 font-mono text-[10px] uppercase tracking-widest text-center">
                  {usdzFile ? usdzFile.name : 'SELECT_.USDZ_FILE'}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block font-mono text-[10px] text-gray-500 uppercase tracking-widest">
                  GLB_URL (GCS_PUBLIC_OR_DRIVE)
                </label>
                <input
                  type="text"
                  value={manualGlbUrl}
                  onChange={(e) => setManualGlbUrl(convertDriveLink(e.target.value))}
                  placeholder="https://storage.googleapis.com/... OR https://drive.google.com/..."
                  className="brutalist-input text-[10px]"
                  disabled={uploading}
                />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[10px] text-gray-500 uppercase tracking-widest">
                  USDZ_URL (GCS_PUBLIC_OR_DRIVE)
                </label>
                <input
                  type="text"
                  value={manualUsdzUrl}
                  onChange={(e) => setManualUsdzUrl(convertDriveLink(e.target.value))}
                  placeholder="https://storage.googleapis.com/... OR https://drive.google.com/..."
                  className="brutalist-input text-[10px]"
                  disabled={uploading}
                />
              </div>

              <div className="border border-[#333] bg-black/50 p-4 font-mono text-[9px] text-gray-400">
                <p className="mb-2 font-bold text-[#00ff00] uppercase tracking-widest">LINK_HELPER:</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-white uppercase">GOOGLE_CLOUD_STORAGE:</p>
                    <p>1. UPLOAD TO GCS BUCKET</p>
                    <p>2. EDIT ACCESS &rarr; ADD 'allUsers' AS 'Reader'</p>
                    <p>3. COPY 'PUBLIC URL'</p>
                  </div>
                  <div className="border-t border-[#222] pt-2">
                    <p className="text-white uppercase">GOOGLE_DRIVE:</p>
                    <p>1. SET FILE SHARING TO 'ANYONE WITH THE LINK'</p>
                    <p>2. PASTE THE SHARE LINK ABOVE (WE WILL AUTO-CONVERT IT)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!uploading && (
            <div className="border border-[#333] bg-black/50 p-4 font-mono text-[10px]">
              <p className="mb-2 text-gray-500 uppercase tracking-widest">PRE_FLIGHT_CHECKLIST:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${name ? 'bg-[#00ff00]' : 'bg-red-500'}`} />
                  <span className={name ? 'text-gray-300' : 'text-red-500'}>ASSET_NAME_DEFINED</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${(uploadMode === 'file' ? (glbFile || usdzFile) : (manualGlbUrl || manualUsdzUrl)) ? 'bg-[#00ff00]' : 'bg-red-500'}`} />
                  <span className={(uploadMode === 'file' ? (glbFile || usdzFile) : (manualGlbUrl || manualUsdzUrl)) ? 'text-gray-300' : 'text-red-500'}>AT_LEAST_ONE_ASSET_SELECTED</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border border-red-900/50 bg-red-900/10 p-3 text-xs text-red-500">
                <AlertTriangle size={14} />
                <span className="font-mono uppercase">{error}</span>
              </div>
              
              {showCorsHelp && (
                <div className="border border-amber-900/50 bg-amber-900/10 p-4 font-mono text-[10px] text-amber-500">
                  <p className="mb-2 font-bold uppercase">ACTION_REQUIRED: CONFIGURE_FIREBASE_CORS</p>
                  <p className="mb-4 opacity-80">
                    YOUR_BROWSER_IS_BLOCKING_THE_UPLOAD. IF YOU GOT A 404 ERROR, RUN THIS TO FIND YOUR BUCKET NAME:
                  </p>
                  <code className="mb-4 block bg-black p-2 text-[#00ff00] break-all">
                    gsutil ls
                  </code>
                  <p className="mb-4 opacity-80">
                    THEN RUN THIS WITH THE NAME FROM ABOVE:
                  </p>
                  <code className="block bg-black p-2 text-[#00ff00] break-all">
                    gsutil cors set cors.json gs://ai-studio-bucket-489438500261-us-west1/
                  </code>
                  <p className="mt-4 opacity-80">
                    REFER_TO_CHAT_FOR_FULL_INSTRUCTIONS.
                  </p>
                </div>
              )}
            </div>
          )}

          {uploading && (
            <div className="space-y-4 border border-[#00ff00]/30 bg-[#00ff00]/5 p-4">
              <div className="flex justify-between font-mono text-xs font-bold uppercase tracking-tighter">
                <span className="text-[#00ff00]">{status || 'UPLOADING_DATA...'}</span>
                <span className="text-[#00ff00]">{Math.round(progress)}%</span>
              </div>
              
              <div className="h-4 w-full border border-[#333] bg-black p-0.5">
                <motion.div
                  className="h-full bg-[#00ff00]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                />
              </div>

              <div className="border-t border-[#00ff00]/10 pt-3">
                <p className="mb-2 font-mono text-[8px] text-gray-500 uppercase tracking-widest">
                  SYSTEM_LOG_STREAM:
                </p>
                <div className="space-y-1 font-mono text-[9px]">
                  {systemLogs.map((log, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1 - i * 0.2, x: 0 }}
                      className="flex items-center gap-2 text-[#00ff00]"
                    >
                      <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                      <span>{log}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 border border-[#00ff00] bg-[#00ff00]/10 p-4 text-[#00ff00]"
              >
                <CheckCircle2 size={24} />
                <div className="font-mono">
                  <p className="text-sm font-bold uppercase">DEPLOYMENT_COMPLETE</p>
                  <p className="text-[10px] uppercase opacity-70">ASSET_SYNCHRONIZED_WITH_DATABASE</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleUpload}
            disabled={uploading || !name || (uploadMode === 'file' ? (!glbFile && !usdzFile) : (!manualGlbUrl && !manualUsdzUrl))}
            title={!name ? 'NAME_REQUIRED' : 'EXECUTE_DEPLOYMENT'}
            className={`brutalist-button flex w-full items-center justify-center gap-2 py-4 transition-all ${
              uploading || !name || (uploadMode === 'file' ? (!glbFile && !usdzFile) : (!manualGlbUrl && !manualUsdzUrl)) ? 'opacity-30 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 size={20} className="animate-spin text-[#00ff00]" />
                <span className="text-[#00ff00]">UPLOADING_{Math.round(progress)}%</span>
              </>
            ) : (
              <>
                <Upload size={20} />
                EXECUTE_DEPLOYMENT
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
