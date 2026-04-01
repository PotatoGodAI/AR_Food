import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Box, Smartphone, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import '@google/model-viewer';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}

interface ModelData {
  name: string;
  glbUrl: string;
  usdzUrl?: string;
}

export default function ARViewer() {
  const { modelId } = useParams();
  const modelViewerRef = useRef<any>(null);
  const [model, setModel] = useState<ModelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function fetchModel() {
      if (!modelId) return;
      try {
        const docRef = doc(db, 'models', modelId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setModel(docSnap.data() as ModelData);
        } else {
          setError('ASSET_NOT_FOUND');
        }
      } catch (err) {
        console.error('FETCH_ERROR', err);
        setError('SYSTEM_ERROR');
      }
    }
    fetchModel();
  }, [modelId]);

  const handleActivateAR = () => {
    if (modelViewerRef.current) {
      try {
        modelViewerRef.current.activateAR();
      } catch (e) {
        console.warn('AR_ACTIVATION_FAILED', e);
      }
    }
  };

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-black font-mono text-red-500">
        <p className="text-xs uppercase tracking-widest">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden flex items-center justify-center">
      {model && (
        <>
          {/* Background Model Viewer - handles the AR logic and pre-loading */}
          <model-viewer
            ref={modelViewerRef}
            src={model.glbUrl}
            ios-src={model.usdzUrl}
            ar
            ar-modes="scene-viewer webxr quick-look"
            camera-controls
            auto-rotate
            shadow-intensity="1"
            environment-image="neutral"
            exposure="1"
            loading="eager"
            reveal="auto"
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              opacity: 0.2, // Slightly visible in background to ensure browser priority
              pointerEvents: 'none',
              zIndex: 0
            }}
            onLoad={() => setIsLoaded(true)}
          >
            <button slot="ar-button" className="hidden" />
          </model-viewer>

          {/* Big Central Button */}
          <div className="relative z-10 flex flex-col items-center">
            <button
              onClick={handleActivateAR}
              disabled={!isLoaded}
              className={`group relative flex flex-col items-center justify-center gap-6 p-12 transition-all ${
                !isLoaded ? 'opacity-50 cursor-wait' : 'active:scale-95'
              }`}
            >
              <div className="relative">
                <div className={`absolute -inset-4 rounded-full border border-[#00ff00]/20 blur-xl ${isLoaded ? 'animate-pulse' : ''}`} />
                <div className={`relative flex h-24 w-24 items-center justify-center border-2 border-[#00ff00] bg-black text-[#00ff00] shadow-[8px_8px_0px_rgba(0,255,0,0.3)] transition-all ${isLoaded ? 'group-hover:shadow-[12px_12px_0px_rgba(0,255,0,0.5)]' : ''}`}>
                  {isLoaded ? <Smartphone size={40} /> : <Loader2 size={40} className="animate-spin" />}
                </div>
              </div>
              
              <div className="text-center">
                <h2 className="font-mono text-2xl font-black uppercase tracking-tighter text-[#00ff00]">
                  {isLoaded ? 'VIEW_IN_AR' : 'LOADING_ASSET'}
                </h2>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.4em] text-gray-500">
                  {isLoaded ? 'PORTAL_READY' : 'SYNCHRONIZING_DATA'}
                </p>
              </div>

              {/* Decorative corner brackets */}
              <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-[#00ff00]/30" />
              <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-[#00ff00]/30" />
              <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-[#00ff00]/30" />
              <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-[#00ff00]/30" />
            </button>

            {!isLoaded && (
              <div className="mt-8 flex items-center gap-2">
                <div className="h-1 w-32 bg-[#111] overflow-hidden">
                  <motion.div 
                    className="h-full bg-[#00ff00]"
                    animate={{ x: [-128, 128] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
