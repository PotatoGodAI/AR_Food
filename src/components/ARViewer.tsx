import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
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
  const [loading, setLoading] = useState(true);
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
      } finally {
        setLoading(false);
      }
    }
    fetchModel();
  }, [modelId]);

  // Attempt to auto-activate AR when model is ready
  useEffect(() => {
    if (modelViewerRef.current && model) {
      const viewer = modelViewerRef.current;
      
      const onModelLoad = () => {
        // Trigger AR immediately
        try {
          viewer.activateAR();
        } catch (e) {
          console.warn('AUTO_AR_FAILED', e);
        }
      };

      viewer.addEventListener('load', onModelLoad);
      return () => viewer.removeEventListener('load', onModelLoad);
    }
  }, [model]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-black font-mono text-red-500">
        <p className="text-xs uppercase tracking-widest">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black">
      {model && (
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
      )}
    </div>
  );
}
