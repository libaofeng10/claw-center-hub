import { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FileUploaderProps {
  onUpload: (name: string, content: string) => void;
  accept?: string;
  className?: string;
}

export default function FileUploader({ onUpload, accept = '.md', className }: FileUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setContent(text);
      const n = file.name.replace(/\.md$/i, '').replace(/SKILL/i, '').replace(/^[-_]+|[-_]+$/g, '');
      if (n && !name) setName(n);
    };
    reader.readAsText(file);
  }, [name]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleSubmit = () => {
    if (!name.trim()) return;
    onUpload(name.trim(), content);
    setName('');
    setContent('');
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="技能名称"
          className="input flex-1"
        />
        <button onClick={handleSubmit} disabled={!name.trim()} className="btn-primary">
          <Upload className="h-4 w-4" />
          创建
        </button>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'rounded-lg border-2 border-dashed p-6 text-center transition-colors',
          dragOver ? 'border-brand-400 bg-brand-50' : 'border-gray-300 bg-gray-50',
        )}
      >
        <Upload className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">拖拽 SKILL.md 文件到此处，或</p>
        <label className="mt-1 inline-block cursor-pointer text-sm font-medium text-brand-600 hover:text-brand-700">
          点击选择文件
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      </div>

      {content && (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="input min-h-[120px] w-full font-mono text-xs"
          placeholder="技能内容（SKILL.md）"
        />
      )}
    </div>
  );
}
