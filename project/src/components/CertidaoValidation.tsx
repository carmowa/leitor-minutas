import { useState } from 'react';
import {
  validateCertidaoData,
  calculateFieldConfidence,
  getConfidenceColor,
  getConfidenceBgColor,
  getConfidenceBorderColor,
  type CertidaoValidation,
  type ConfidenceScore,
} from '../lib/validators';
import { AlertCircle, CheckCircle, AlertTriangle, ZapOff } from 'lucide-react';

interface CertidaoValidationProps {
  onValidationComplete: (data: CertidaoValidation, confidenceScores: ConfidenceScore[]) => void;
  onCancel: () => void;
}

export function CertidaoValidation({
  onValidationComplete,
  onCancel,
}: CertidaoValidationProps) {
  const [formData, setFormData] = useState<CertidaoValidation>({
    requester_name: '',
    requester_email: '',
    requester_phone: '',
    certidao_type: '',
    act_data: '',
    delivery_method: '',
    custom_instructions: '',
  });

  const [validationResult, setValidationResult] = useState<ReturnType<typeof validateCertidaoData> | null>(null);
  const [confidenceScores, setConfidenceScores] = useState<ConfidenceScore[]>([]);
  const [showConfidence, setShowConfidence] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Calculate confidence for this field
    if (value.trim().length > 0) {
      const confidence = calculateFieldConfidence(name, value);
      setConfidenceScores((prev) => {
        const filtered = prev.filter((c) => c.field !== name);
        return [...filtered, confidence];
      });
    }
  };

  const handleValidate = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateCertidaoData(formData);
    setValidationResult(result);

    if (result.isValid) {
      // Calculate confidence for all fields
      const scores: ConfidenceScore[] = [
        calculateFieldConfidence('requester_name', formData.requester_name),
        calculateFieldConfidence('requester_email', formData.requester_email),
        calculateFieldConfidence('requester_phone', formData.requester_phone),
        calculateFieldConfidence('certidao_type', formData.certidao_type),
        calculateFieldConfidence('act_data', formData.act_data),
        calculateFieldConfidence('delivery_method', formData.delivery_method),
      ];
      setConfidenceScores(scores);
      setShowConfidence(true);
    }
  };

  const handleContinue = () => {
    if (validationResult?.isValid) {
      onValidationComplete(formData, confidenceScores);
    }
  };

  const certidaoOptions = [
    'Nascimento',
    'Casamento',
    'Óbito',
    'Divórcio',
    'União Estável',
    'Outro',
  ];

  const deliveryOptions = ['Presencial', 'Correio', 'Email', 'Download Digital', 'Outro'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Validação de Dados da Certidão
          </h1>
          <p className="text-slate-600 mb-8">
            Confirme os dados extraídos da certidão para garantir a melhor transformação em minuta
          </p>

          {!showConfidence ? (
            <form onSubmit={handleValidate} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome do Requerente *
                  </label>
                  <input
                    type="text"
                    name="requester_name"
                    value={formData.requester_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="Nome completo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="requester_email"
                    value={formData.requester_email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    name="requester_phone"
                    value={formData.requester_phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tipo de Certidão *
                  </label>
                  <select
                    name="certidao_type"
                    value={formData.certidao_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  >
                    <option value="">Selecione...</option>
                    {certidaoOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Forma de Entrega *
                  </label>
                  <select
                    name="delivery_method"
                    value={formData.delivery_method}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  >
                    <option value="">Selecione...</option>
                    {deliveryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Dados do Ato (Extraído da Certidão) *
                </label>
                <textarea
                  name="act_data"
                  value={formData.act_data}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-mono text-sm"
                  placeholder="Cole aqui os dados extraídos da certidão..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Instruções Customizadas para o GPT
                </label>
                <textarea
                  name="custom_instructions"
                  value={formData.custom_instructions}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-mono text-sm"
                  placeholder="Insira instruções específicas de como o GPT deve processar estes dados. Ex: 'Coloque ênfase em datas e nomes completos' ou 'Ignore campos vazios e marque como [PREENCHER]'"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Essas instruções serão passadas ao modelo de IA para maior precisão
                </p>
              </div>

              {validationResult && !validationResult.isValid && (
                <div className="space-y-3">
                  {validationResult.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <h3 className="font-medium text-red-900">Erros encontrados:</h3>
                      </div>
                      <ul className="space-y-1">
                        {validationResult.errors.map((error, idx) => (
                          <li key={idx} className="text-sm text-red-700">
                            • {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {validationResult.warnings.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        <h3 className="font-medium text-amber-900">Avisos:</h3>
                      </div>
                      <ul className="space-y-1">
                        {validationResult.warnings.map((warning, idx) => (
                          <li key={idx} className="text-sm text-amber-700">
                            • {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                >
                  Validar e Revisar
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-blue-700">
                    Dados validados com sucesso! Revise a confiabilidade de cada campo.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800">
                  Análise de Confiabilidade
                </h2>

                {confidenceScores.map((score) => (
                  <div
                    key={score.field}
                    className={`rounded-lg border p-4 ${getConfidenceBgColor(score.score)} ${getConfidenceBorderColor(score.score)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-800">
                        {formatFieldName(score.field)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-bold ${getConfidenceColor(score.score)}`}>
                          {score.score}%
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 mb-2">
                      {getFormDataValue(formData, score.field)}
                    </p>
                    <p className={`text-xs ${getConfidenceColor(score.score)}`}>
                      {score.reason}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h3 className="font-medium text-slate-800 mb-2">Instruções Customizadas</h3>
                <p className="text-sm text-slate-700">
                  {formData.custom_instructions || 'Nenhuma instrução adicional fornecida'}
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowConfidence(false)}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition"
                >
                  Editar Dados
                </button>
                <button
                  onClick={handleContinue}
                  className="flex-1 px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                  <ZapOff className="w-5 h-5" />
                  Prosseguir para Minuta
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatFieldName(field: string): string {
  const names: Record<string, string> = {
    requester_name: 'Nome do Requerente',
    requester_email: 'Email',
    requester_phone: 'Telefone',
    certidao_type: 'Tipo de Certidão',
    act_data: 'Dados do Ato',
    delivery_method: 'Forma de Entrega',
  };
  return names[field] || field;
}

function getFormDataValue(data: CertidaoValidation, field: string): string {
  const fieldKey = field as keyof CertidaoValidation;
  const value = data[fieldKey];
  if (typeof value === 'string') {
    return value.substring(0, 100) + (value.length > 100 ? '...' : '');
  }
  return '';
}
