import { getConfidenceColor, getConfidenceBgColor, getConfidenceBorderColor } from '../lib/validators';
import { HelpCircle } from 'lucide-react';

interface ConfidenceField {
  label: string;
  value: string;
  confidence: number;
  reason: string;
}

interface ConfidenceDisplayProps {
  fields: ConfidenceField[];
  compact?: boolean;
}

export function ConfidenceDisplay({ fields, compact = false }: ConfidenceDisplayProps) {
  if (compact) {
    return (
      <div className="space-y-2">
        {fields.map((field, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between p-2 rounded border ${getConfidenceBgColor(field.confidence)} ${getConfidenceBorderColor(field.confidence)}`}
          >
            <span className="text-sm font-medium text-slate-700">{field.label}</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${getConfidenceColor(field.confidence)}`}>
                {field.confidence}%
              </span>
              <div
                className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden"
                title={field.reason}
              >
                <div
                  className={`h-full ${getConfidenceBarColor(field.confidence)}`}
                  style={{ width: `${field.confidence}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fields.map((field, idx) => (
        <div
          key={idx}
          className={`rounded-lg border p-4 ${getConfidenceBgColor(field.confidence)} ${getConfidenceBorderColor(field.confidence)}`}
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <span className="font-medium text-slate-800">{field.label}</span>
              <p className="text-xs text-slate-600 mt-1">{field.value}</p>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-bold ${getConfidenceColor(field.confidence)}`}>
                {field.confidence}%
              </span>
            </div>
          </div>

          <div className="mb-3">
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all ${getConfidenceBarColor(field.confidence)}`}
                style={{ width: `${field.confidence}%` }}
              />
            </div>
          </div>

          <div className="flex items-start gap-2">
            <HelpCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${getConfidenceColor(field.confidence)}`} />
            <p className={`text-xs ${getConfidenceColor(field.confidence)}`}>{field.reason}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function getConfidenceBarColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 70) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  if (score >= 30) return 'bg-orange-500';
  return 'bg-red-500';
}

export function ConfidenceBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  return (
    <div
      className={`${sizeClasses[size]} font-bold rounded-full ${getConfidenceBgColor(score)} ${getConfidenceColor(score)} border ${getConfidenceBorderColor(score)}`}
    >
      {score}%
    </div>
  );
}
