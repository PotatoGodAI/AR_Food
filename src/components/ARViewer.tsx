import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loader2, ArrowLeft } from 'lucide-react';
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
  const navigate = useNavigate();
  const modelViewerRef = useRef<any>(null);
  const [model, setModel] = useState<ModelData | null>(null);
  const [loading, setLoading] = useState(true);
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
      } finally {
        setLoading(false);
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

  useEffect(() => {
    if (modelViewerRef.current && model) {
      const viewer = modelViewerRef.current;
      const onModelLoad = () => {
        setIsLoaded(true);
        // Try auto-activation (might be blocked)
        setTimeout(() => {
          handleActivateAR();
        }, 1000);
      };
      viewer.addEventListener('load', onModelLoad);
      return () => viewer.removeEventListener('load', onModelLoad);
    }
  }, [model]);

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black font-mono text-red-500 p-4 text-center">
        <p className="text-xs uppercase tracking-widest mb-4">{error}</p>
        <button onClick={() => navigate('/')} className="brutalist-button text-white text-[10px] px-4 py-2">
          RETURN_TO_BASE
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden">
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black">
          <Loader2 className="mb-2 animate-spin text-[#00ff00]" size={24} />
          <p className="font-mono text-[8px] text-[#00ff00] uppercase tracking-[0.2em]">
            INITIALIZING_PORTAL...
          </p>
        </div>
      )}

      {model && (
        <>
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
            style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
          >
            <button slot="ar-button" className="hidden" />
          </model-viewer>

          {/* Invisible trigger layer for user gesture */}
          {!loading && isLoaded && (
            <div 
              onClick={handleActivateAR}
              className="absolute inset-0 z-40 flex flex-col items-center justify-center cursor-pointer bg-black/10"
            >
              <div className="flex flex-col items-center animate-pulse pointer-events-none">
                <p className="font-mono text-[10px] text-[#00ff00] uppercase tracking-[0.3em] mb-2">
                  TAP_TO_LAUNCH_AR
                </p>
                <div className="h-[1px] w-12 bg-[#00ff00]/30" />
              </div>
            </div>
          )}

          {/* Minimal Back Button */}
          <button
            onClick={() => navigate('/')}
            className="absolute top-6 left-6 z-50 flex h-8 w-8 items-center justify-center border border-[#333] bg-black/50 text-white backdrop-blur-sm hover:border-[#00ff00] hover:text-[#00ff00]"
          >
            <ArrowLeft size={16} />
          </button>
        </>
      )}
    </div>
  );
}
