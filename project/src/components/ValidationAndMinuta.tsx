import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ConfidenceBadge } from './ConfidenceDisplay';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  ArrowLeft,
  Eye,
} from 'lucide-react';
import { calculateFieldConfidence, type ConfidenceScore } from '../lib/validators';

interface ValidationAndMinutaProps {
  file: File;
  onBack: () => void;
}

interface ExtractedData {
  requester_name: string;
  requester_email: string;
  requester_phone: string;
  certidao_type: string;
  act_data: string;
  delivery_method: string;
}

interface MinutaField {
  label: string;
  value: string;
  confidence: number;
}

export function ValidationAndMinuta({ file, onBack }: ValidationAndMinutaProps) {
  const [step, setStep] = useState<'validation' | 'minuta'>('validation');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [confidenceScores, setConfidenceScores] = useState<ConfidenceScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatedMinuta, setGeneratedMinuta] = useState('');
  const [minutaFields, setMinutaFields] = useState<MinutaField[]>([]);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [templates, setTemplates] = useState<{ id: string; name: string; content: string }[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (step === 'validation') {
      extractAndValidate();
    }
  }, [step]);

  useEffect(() => {
    if (user) {
      loadTemplates();
    }
  }, [user]);

  const loadTemplates = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      setTemplates(data);
    }
  };

  const extractAndValidate = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('openai_api_key')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!settings?.openai_api_key) {
        throw new Error('API Key da OpenAI não configurada');
      }

      // Extract text from file
      const extractedText = await extractFileContent(file, settings.openai_api_key);

      // Send to OpenAI for data extraction
      const apiUrl = 'https://api.openai.com/v1/chat/completions';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.openai_api_key}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Você é um extrator de dados de certidões.

Extraia os seguintes dados da certidão:
- Nome do requerente
- Email (se disponível, senão deixe vazio)
- Telefone (se disponível, senão deixe vazio)
- Tipo de certidão (nascimento, casamento, óbito, etc)
- Dados do ato (data, local, nomes envolvidos, etc)
- Forma de entrega preferida (presencial, correio, email, digital)

Retorne em JSON com exatamente esta estrutura:
{
  "requester_name": "nome",
  "requester_email": "email",
  "requester_phone": "telefone",
  "certidao_type": "tipo",
  "act_data": "dados",
  "delivery_method": "forma"
}`,
            },
            {
              role: 'user',
              content: `Extraia os dados desta certidão:\n\n${extractedText}`,
            },
          ],
          temperature: 0.2,
        }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(`Erro ao extrair dados: ${data.error.message}`);
      }

      const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
      const extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      setExtractedData(extracted);

      // Calculate confidence scores
      const scores: ConfidenceScore[] = [
        calculateFieldConfidence('requester_name', extracted.requester_name || ''),
        calculateFieldConfidence('requester_email', extracted.requester_email || ''),
        calculateFieldConfidence('requester_phone', extracted.requester_phone || ''),
        calculateFieldConfidence('certidao_type', extracted.certidao_type || ''),
        calculateFieldConfidence('act_data', extracted.act_data || ''),
        calculateFieldConfidence('delivery_method', extracted.delivery_method || ''),
      ];

      setConfidenceScores(scores);
      setLoading(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao processar arquivo');
      }
      setLoading(false);
    }
  };

  const extractFileContent = async (
    file: File,
    openaiApiKey: string
  ): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Send to Edge Function for extraction
    const formData = new FormData();
    formData.append('file', file);
    formData.append('openaiApiKey', openaiApiKey);

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-text`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Erro ao extrair texto do arquivo');
    }

    const data = await response.json();
    return data.text || '';
  };

  const generateMinuta = async () => {
    if (!extractedData || !user) return;

    setDownloadLoading(true);
    setError('');

    try {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('openai_api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!settings?.openai_api_key) {
        throw new Error('API Key não configurada');
      }

      let template = templates[0]?.content || `MINUTA DE [TIPO_CERTIDAO]

Requerente: [NOME_REQUERENTE]
Email: [EMAIL]
Telefone: [TELEFONE]

Tipo: [TIPO_CERTIDAO]
Dados do Ato: [DADOS_ATO]
Forma de Entrega: [FORMA_ENTREGA]`;

      // Extract minuta content from file
      const extractedText = await extractFileContent(file, settings.openai_api_key);

      // Generate minuta with confidence scores
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.openai_api_key}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Você é um especialista em redação jurídica.

Com base no conteúdo da certidão, gere uma minuta padronizada.

Dados do requerente:
- Nome: ${extractedData.requester_name}
- Email: ${extractedData.requester_email}
- Telefone: ${extractedData.requester_phone}

Tipo de certidão: ${extractedData.certidao_type}
Dados do ato: ${extractedData.act_data}
Forma de entrega: ${extractedData.delivery_method}

Modelo a seguir:
${template}

Para cada seção da minuta, estime um score de confiabilidade (0-100%) baseado em clareza e completude dos dados.

Retorne em JSON com esta estrutura:
{
  "minutaContent": "texto completo da minuta aqui",
  "confidenceScores": [
    {"label": "Nome Completo", "value": "valor", "confidence": 95},
    {"label": "Data do Ato", "value": "valor", "confidence": 85},
    ...
  ]
}`,
            },
            {
              role: 'user',
              content: `Baseado na certidão extraída:\n\n${extractedText}\n\nGere a minuta com análise de confiabilidade.`,
            },
          ],
          temperature: 0.3,
        }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(`Erro ao gerar minuta: ${data.error.message}`);
      }

      const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      setGeneratedMinuta(result.minutaContent || data.choices[0].message.content);
      setMinutaFields(result.confidenceScores || []);
      setStep('minuta');
      setDownloadLoading(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
      setDownloadLoading(false);
    }
  };

  const downloadToDesktop = async () => {
    if (!user) return;

    try {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('openai_api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!settings?.openai_api_key) {
        throw new Error('API Key não configurada');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-docx`;
      const docFormData = new FormData();
      docFormData.append('content', generatedMinuta);
      docFormData.append('filename', `minuta_${Date.now()}`);

      const docResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: docFormData,
      });

      if (!docResponse.ok) {
        throw new Error('Erro ao gerar documento');
      }

      const docBlob = await docResponse.blob();
      const url = window.URL.createObjectURL(docBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `minuta_${Date.now()}.docx`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Processando arquivo...</p>
        </div>
      </div>
    );
  }

  if (step === 'validation') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                  Dados da Certidão
                </h2>

                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-1">Nome do Requerente</p>
                      <p className="text-lg text-slate-800">{extractedData?.requester_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-1">Tipo de Certidão</p>
                      <p className="text-lg text-slate-800">{extractedData?.certidao_type}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-1">Email</p>
                      <p className="text-lg text-slate-800">{extractedData?.requester_email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-1">Telefone</p>
                      <p className="text-lg text-slate-800">{extractedData?.requester_phone || '-'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Dados do Ato</p>
                    <p className="text-slate-800 bg-slate-50 p-3 rounded max-h-24 overflow-y-auto">
                      {extractedData?.act_data}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Forma de Entrega</p>
                    <p className="text-lg text-slate-800">{extractedData?.delivery_method}</p>
                  </div>
                </div>

                <button
                  onClick={generateMinuta}
                  disabled={downloadLoading}
                  className="w-full mt-8 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {downloadLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Gerando Minuta...
                    </>
                  ) : (
                    <>
                      <Eye className="w-5 h-5" />
                      Gerar Minuta
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-bold text-slate-800 mb-4">Confiabilidade</h3>
              <div className="space-y-3">
                {confidenceScores.map((score) => (
                  <div key={score.field} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">
                        {formatFieldName(score.field)}
                      </span>
                      <ConfidenceBadge score={score.score} size="sm" />
                    </div>
                    <p className="text-xs text-slate-600">{score.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => setStep('validation')}
          className="mb-6 flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Minuta Gerada</h2>
            <div className="bg-slate-50 rounded-lg p-6 max-h-96 overflow-y-auto font-mono text-sm whitespace-pre-wrap">
              {generatedMinuta}
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={downloadToDesktop}
              className="w-full mt-6 px-6 py-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              <Download className="w-5 h-5" />
              Baixar para Área de Trabalho
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="font-bold text-slate-800 mb-4">Análise de Confiabilidade</h3>
            <div className="space-y-3">
              {minutaFields.length > 0 ? (
                minutaFields.map((field, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700 line-clamp-1">
                        {field.label}
                      </span>
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
