'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Paperclip, Upload, Trash2, FileText, Image, File, Loader2, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { listAttachments, createAttachment, deleteAttachment } from '@/app/actions/financeiro';

// =====================================================
// AttachmentPanel — Painel de anexos reutilizável
// =====================================================

export interface AttachmentPanelProps {
  empresaId: string;
  entityType: string;
  entityId: string;
  readOnly?: boolean;
}

function getFileIcon(mimeType?: string): React.ElementType {
  if (!mimeType) return File;
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
  return File;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export const AttachmentPanel: React.FC<AttachmentPanelProps> = ({
  empresaId,
  entityType,
  entityId,
  readOnly = false,
}) => {
  const [attachments, setAttachments] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await listAttachments(entityType, entityId);
        if (!cancelled) setAttachments(data);
      } catch {
        // silently handle
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [entityType, entityId]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      // For now, create a reference-only attachment (real upload would use Supabase Storage)
      // This creates the record with a placeholder URL
      const result = await createAttachment(empresaId, {
        entity_type: entityType,
        entity_id: entityId,
        file_name: file.name,
        file_url: `attachments/${entityType}/${entityId}/${file.name}`, // placeholder
        file_size: file.size,
        mime_type: file.type,
      });

      if (!result.error && result.data) {
        setAttachments(prev => [result.data as Record<string, unknown>, ...prev]);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const result = await deleteAttachment(id);
    if (!result.error) {
      setAttachments(prev => prev.filter(a => a.id !== id));
    }
    setDeletingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Upload button */}
      {!readOnly && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 w-full',
              'border border-dashed border-white/10 rounded-xl',
              'text-sm text-slate-400 hover:text-white hover:border-white/20',
              'transition-colors',
              uploading && 'opacity-50'
            )}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? 'Enviando...' : 'Adicionar anexo'}
          </button>
        </div>
      )}

      {/* Attachment list */}
      {attachments.length === 0 ? (
        <div className="text-center py-6">
          <Paperclip className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nenhum anexo</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {attachments.map((att) => {
            const FileIcon = getFileIcon(att.mime_type as string | undefined);
            return (
              <div
                key={att.id as string}
                className="flex items-center gap-3 p-2.5 bg-[#252d3d]/50 rounded-lg hover:bg-[#252d3d]/80 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                  <FileIcon className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{att.file_name as string}</p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(att.file_size as number | undefined)}
                    {att.descricao && ` • ${att.descricao as string}`}
                  </p>
                </div>
                {!readOnly && (
                  <button
                    onClick={() => handleDelete(att.id as string)}
                    disabled={deletingId === att.id}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/15 rounded-lg transition-all"
                  >
                    {deletingId === att.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
