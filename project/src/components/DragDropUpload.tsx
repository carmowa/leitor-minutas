import { useState } from 'react';
import { Upload, File, AlertCircle } from 'lucide-react';

interface DragDropUploadProps {
  onFileSelected: (file: File) => void;
  onValidateClick: () => void;
  isLoading?: boolean;
}

export function DragDropUpload({
  onFileSelected,
  onValidateClick,
  isLoading = false,
}: DragDropUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const acceptedFormats = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/jpg'];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError('');

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    if (!acceptedFormats.includes(selectedFile.type)) {
      setError('Formato não suportado. Use PDF, DOCX ou imagens (PNG/JPG).');
      setFile(null);
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 50MB.');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    onFileSelected(selectedFile);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-12 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-white bg-opacity-20 p-4 rounded-full">
                <Upload className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Gerador de Minutas</h1>
            <p className="text-blue-100">Transforme certidões em minutas padronizadas</p>
          </div>

          {/* Main Content */}
          <div className="p-8">
            {/* Drag and Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                isDragging
                  ? 'border-blue-600 bg-blue-50 scale-105'
                  : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.docx,.png,.jpg,.jpeg"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isLoading}
              />

              {!file ? (
                <>
                  <Upload className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">
                    Arraste sua certidão aqui
                  </h2>
                  <p className="text-slate-600 mb-4">
                    ou clique para selecionar um arquivo
                  </p>
                  <div className="flex justify-center gap-4 text-sm text-slate-500">
                    <span className="bg-white px-3 py-1 rounded-full border border-slate-300">
                      PDF
                    </span>
                    <span className="bg-white px-3 py-1 rounded-full border border-slate-300">
                      DOCX
                    </span>
                    <span className="bg-white px-3 py-1 rounded-full border border-slate-300">
                      PNG/JPG
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <File className="w-10 h-10 text-green-600" />
                  <div className="text-left">
                    <p className="font-semibold text-slate-800">{file.name}</p>
                    <p className="text-sm text-slate-600">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={onValidateClick}
              disabled={!file || isLoading}
              className="w-full mt-8 px-6 py-4 bg-blue-600 text-white font-bold text-lg rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isLoading ? 'Processando...' : 'Validar Certidão'}
            </button>

            {/* Info Text */}
            <p className="text-center text-xs text-slate-500 mt-6">
              Máximo 50MB. Seus arquivos são processados com segurança.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
