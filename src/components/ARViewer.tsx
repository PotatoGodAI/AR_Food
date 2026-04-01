import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Box, Smartphone } from 'lucide-react';
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
          {/* Hidden Model Viewer - handles the AR logic */}
          <model-viewer
            ref={modelViewerRef}
            src={model.glbUrl}
            ios-src={model.usdzUrl}
            ar
            ar-modes="webxr scene-viewer quick-look"
            camera-controls
            auto-rotate
            shadow-intensity="1"
            environment-image="neutral"
            exposure="1"
            style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0 }}
          >
            <button slot="ar-button" className="hidden" />
          </model-viewer>

          {/* Big Central Button */}
          <button
            onClick={handleActivateAR}
            className="group relative flex flex-col items-center justify-center gap-6 p-12 transition-all active:scale-95"
          >
            <div className="relative">
              <div className="absolute -inset-4 animate-pulse rounded-full border border-[#00ff00]/20 blur-xl" />
              <div className="relative flex h-24 w-24 items-center justify-center border-2 border-[#00ff00] bg-black text-[#00ff00] shadow-[8px_8px_0px_rgba(0,255,0,0.3)] group-hover:shadow-[12px_12px_0px_rgba(0,255,0,0.5)] transition-all">
                <Smartphone size={40} />
              </div>
            </div>
            
            <div className="text-center">
              <h2 className="font-mono text-2xl font-black uppercase tracking-tighter text-[#00ff00]">
                VIEW_IN_AR
              </h2>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.4em] text-gray-500">
                INITIALIZE_PORTAL
              </p>
            </div>

            {/* Decorative corner brackets */}
            <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-[#00ff00]/30" />
            <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-[#00ff00]/30" />
            <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-[#00ff00]/30" />
            <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-[#00ff00]/30" />
          </button>
        </>
      )}
    </div>
  );
}
