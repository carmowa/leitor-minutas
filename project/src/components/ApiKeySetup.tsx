import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Key, Save } from 'lucide-react';

interface ApiKeySetupProps {
  onComplete: () => void;
}

export function ApiKeySetup({ onComplete }: ApiKeySetupProps) {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    loadApiKey();
  }, [user]);

  const loadApiKey = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_settings')
      .select('openai_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data?.openai_api_key) {
      setApiKey(data.openai_api_key);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError('');
    setLoading(true);

    try {
      const { data: existing } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error: updateError } = await supabase
          .from('user_settings')
          .update({
            openai_api_key: apiKey,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            openai_api_key: apiKey,
          });

        if (insertError) throw insertError;
      }

      onComplete();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao salvar API Key');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-amber-100 p-3 rounded-xl">
            <Key className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Configurar API Key OpenAI
            </h2>
            <p className="text-slate-600 text-sm">
              Necessária para processar documentos com IA
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              API Key da OpenAI
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-mono text-sm"
              placeholder="sk-..."
              required
            />
            <p className="mt-2 text-sm text-slate-500">
              Obtenha sua chave em{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                platform.openai.com
              </a>
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Salvando...' : 'Salvar e Continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}
