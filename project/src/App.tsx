import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { ApiKeySetup } from './components/ApiKeySetup';
import { DragDropUpload } from './components/DragDropUpload';
import { ValidationAndMinuta } from './components/ValidationAndMinuta';
import { supabase } from './lib/supabase';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [hasApiKey, setHasApiKey] = useState(false);
  const [checkingApiKey, setCheckingApiKey] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    checkApiKey();
  }, [user]);

  const checkApiKey = async () => {
    if (!user) {
      setCheckingApiKey(false);
      return;
    }

    const { data } = await supabase
      .from('user_settings')
      .select('openai_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    setHasApiKey(!!data?.openai_api_key);
    setCheckingApiKey(false);
  };

  if (loading || checkingApiKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <ApiKeySetup onComplete={() => setHasApiKey(true)} />
      </div>
    );
  }

  if (selectedFile) {
    return (
      <ValidationAndMinuta
        file={selectedFile}
        onBack={() => setSelectedFile(null)}
      />
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => signOut()}
        className="absolute top-6 right-6 px-4 py-2 text-slate-600 hover:text-slate-800 transition text-sm font-medium"
      >
        Sair
      </button>
      <DragDropUpload
        onFileSelected={setSelectedFile}
        onValidateClick={() => {}}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
