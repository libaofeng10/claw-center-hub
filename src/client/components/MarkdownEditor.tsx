import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/cn';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  saving?: boolean;
  className?: string;
}

export default function MarkdownEditor({ value, onChange, onSave, saving, className }: MarkdownEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('split');

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {(['edit', 'split', 'preview'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {m === 'edit' ? '编辑' : m === 'preview' ? '预览' : '分屏'}
            </button>
          ))}
        </div>
        {onSave && (
          <button onClick={onSave} disabled={saving} className="btn-primary text-xs">
            {saving ? '保存中...' : '保存'}
          </button>
        )}
      </div>

      <div className={cn('mt-3 flex flex-1 gap-4', mode === 'preview' && 'flex-col')}>
        {mode !== 'preview' && (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              'min-h-[400px] flex-1 resize-y rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm leading-relaxed outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
              mode === 'edit' ? 'w-full' : 'w-1/2',
            )}
            spellCheck={false}
          />
        )}
        {mode !== 'edit' && (
          <div
            className={cn(
              'prose prose-sm max-w-none flex-1 overflow-auto rounded-lg border border-gray-200 bg-white p-4',
              mode === 'split' ? 'w-1/2' : 'w-full min-h-[400px]',
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
