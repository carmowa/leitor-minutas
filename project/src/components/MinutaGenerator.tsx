import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CertidaoValidation } from './CertidaoValidation';
import { ConfidenceDisplay, ConfidenceBadge } from './ConfidenceDisplay';
import {
  Upload,
  FileText,
  Download,
  LogOut,
  Loader2,
  File,
  Settings,
  Plus,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { type ConfidenceScore } from '../lib/validators';

interface MinutaField {
  label: string;
  value: string;
  confidence: number;
}

export function MinutaGenerator() {
  const [file, setFile] = useState<File | null>(null);
  const [outputName, setOutputName] = useState('');
  const [template, setTemplate] = useState('');
  const [templates, setTemplates] = useState<{ id: string; name: string; content: string }[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const [validationData, setValidationData] = useState<any>(null);
  const [confidenceScores, setConfidenceScores] = useState<ConfidenceScore[]>([]);
  const [generatedMinuta, setGeneratedMinuta] = useState<string>('');
  const [minutaFields, setMinutaFields] = useState<MinutaField[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    loadTemplates();
  }, [user]);

  const loadTemplates = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setTemplates(data);
      if (data.length > 0) {
        const defaultTemplate = data.find((t) => t.is_default) || data[0];
        setSelectedTemplateId(defaultTemplate.id);
        setTemplate(defaultTemplate.content);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png',
        'image/jpeg',
        'image/jpg',
      ];

      if (!validTypes.includes(selectedFile.type)) {
        setError('Formato de arquivo não suportado. Use PDF, DOCX ou imagens (PNG/JPG).');
        return;
      }

      setFile(selectedFile);
      setError('');
      if (!outputName) {
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
        setOutputName(`${nameWithoutExt}_minuta`);
      }
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const selected = templates.find((t) => t.id === templateId);
    if (selected) {
      setTemplate(selected.content);
    }
  };

  const handleSaveTemplate = async () => {
    if (!user || !newTemplateName || !template) return;

    try {
      const { error: insertError } = await supabase.from('templates').insert({
        user_id: user.id,
        name: newTemplateName,
        content: template,
        is_default: templates.length === 0,
      });

      if (insertError) throw insertError;

      setNewTemplateName('');
      setShowTemplateForm(false);
      await loadTemplates();
      setSuccess('Template salvo com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  const handleValidationComplete = (data: any, scores: ConfidenceScore[]) => {
    setValidationData(data);
    setConfidenceScores(scores);
    setShowValidation(false);
  };

  const handleGenerateMinuta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user || !validationData) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('outputName', outputName);
      formData.append('template', template);
      formData.append('userId', user.id);
      formData.append('validationData', JSON.stringify(validationData));
      formData.append('customInstructions', validationData.custom_instructions || '');

      const { data: settings } = await supabase
        .from('user_settings')
        .select('openai_api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!settings?.openai_api_key) {
        throw new Error('API Key da OpenAI não configurada');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-minuta`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Erro ao processar documento');
      }

      // Extract confidence scores from headers
      const minutaFieldsHeader = response.headers.get('X-Minuta-Fields');
      if (minutaFieldsHeader) {
        try {
          const fields = JSON.parse(minutaFieldsHeader);
          setMinutaFields(fields);
        } catch (e) {
          console.error('Error parsing minuta fields:', e);
        }
      }

      const blob = await response.blob();
      const text = await blob.text();
      setGeneratedMinuta(text);
      setSuccess('Minuta gerada com sucesso!');
      setShowPreview(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao gerar minuta');
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadMinuta = async () => {
    if (!generatedMinuta || !user) return;

    try {
      const formData = new FormData();
      const blob = new Blob([generatedMinuta], { type: 'text/plain' });
      formData.append('content', blob);
      formData.append('filename', outputName);
      formData.append('userId', user.id);

      const { data: settings } = await supabase
        .from('user_settings')
        .select('openai_api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!settings?.openai_api_key) {
        throw new Error('API Key da OpenAI não configurada');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-docx`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar documento');
      }

      const docBlob = await response.blob();
      const url = window.URL.createObjectURL(docBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${outputName}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('Arquivo baixado com sucesso!');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  if (showValidation) {
    return (
      <CertidaoValidation
        onValidationComplete={handleValidationComplete}
        onCancel={() => setShowValidation(false)}
      />
    );
  }

  if (showPreview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-800">Minuta Gerada com Análise de Confiabilidade</h1>
            <button
              onClick={() => setShowPreview(false)}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 transition"
            >
              Voltar
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Conteúdo da Minuta</h2>
              <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm whitespace-pre-wrap">
                {generatedMinuta}
              </div>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={downloadMinuta}
                className="mt-6 w-full px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Baixar como DOCX
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Análise de Confiabilidade</h2>
              <div className="space-y-3">
                {minutaFields.length > 0 ? (
                  minutaFields.map((field, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">{field.label}</span>
                        <ConfidenceBadge score={field.confidence} size="sm" />
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">{field.value}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Nenhuma análise disponível</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-3 rounded-xl">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Gerador de Minutas com IA</h1>
              <p className="text-slate-600">Transforme certidões em minutas padronizadas</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 transition"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>

        {!validationData ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <Upload className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Comece Aqui</h2>
            <p className="text-slate-600 mb-6">
              Faça upload de uma certidão para iniciar o processo de validação e transformação em minuta
            </p>
            <button
              onClick={() => setShowValidation(true)}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
            >
              Validar Certidão
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <h2 className="text-xl font-bold text-green-900">Dados Validados</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Requerente</p>
                    <p className="text-slate-800">{validationData.requester_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700 font-medium">Tipo de Certidão</p>
                    <p className="text-slate-800">{validationData.certidao_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700 font-medium">Email</p>
                    <p className="text-slate-800">{validationData.requester_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700 font-medium">Forma de Entrega</p>
                    <p className="text-slate-800">{validationData.delivery_method}</p>
                  </div>
                </div>

                <button
                  onClick={() => setValidationData(null)}
                  className="px-4 py-2 text-green-600 hover:text-green-700 font-medium text-sm"
                >
                  Editar Dados
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Upload className="w-6 h-6 text-blue-600" />
                  Processamento
                </h2>

                <form onSubmit={handleGenerateMinuta} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Arquivo (PDF, DOCX, PNG, JPG)
                    </label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.docx,.png,.jpg,.jpeg"
                      className="w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-500 transition"
                      required
                    />
                    {file && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                        <File className="w-4 h-4" />
                        {file.name}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nome do arquivo de saída
                    </label>
                    <input
                      type="text"
                      value={outputName}
                      onChange={(e) => setOutputName(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      placeholder="minuta_final"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Template
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    >
                      <option value="">Selecione um template</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                      {success}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !file || !template}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Eye className="w-5 h-5" />
                        Gerar Minuta com Análise
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Settings className="w-6 h-6 text-blue-600" />
                  Confiabilidade
                </h2>
              </div>

              <div className="space-y-3">
                {confidenceScores.map((score) => (
                  <div key={score.field} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{formatFieldName(score.field)}</span>
                      <ConfidenceBadge score={score.score} size="sm" />
                    </div>
                    <p className="text-xs text-slate-600">{score.reason}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200">
                <button
                  onClick={() => setShowValidation(true)}
                  className="w-full px-4 py-2 text-blue-600 hover:text-blue-700 font-medium text-sm bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                >
                  Editar Validação
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatFieldName(field: string): string {
  const names: Record<string, string> = {
    requester_name: 'Nome',
    requester_email: 'Email',
    requester_phone: 'Telefone',
    certidao_type: 'Tipo',
    act_data: 'Dados do Ato',
    delivery_method: 'Entrega',
  };
  return names[field] || field;
}
