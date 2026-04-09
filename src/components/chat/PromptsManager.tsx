'use client';

import { useState, useEffect } from 'react';
import { CustomPrompt } from '@/types';

interface PromptsManagerProps {
  prompts: CustomPrompt[];
  onSave: (prompt: Omit<CustomPrompt, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, prompt: Partial<CustomPrompt>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function PromptsManager({ prompts, onSave, onUpdate, onDelete, onClose }: PromptsManagerProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Pré-remplir les champs lors de l'édition
  useEffect(() => {
    if (editingId) {
      const prompt = prompts.find(p => p.id === editingId);
      if (prompt) {
        setTitle(prompt.title);
        setContent(prompt.content);
        setIsAdding(true);
      }
    } else if (!isAdding) {
      setTitle('');
      setContent('');
    }
  }, [editingId, prompts, isAdding]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    if (editingId) {
      onUpdate(editingId, { title, content });
    } else {
      onSave({ title, content });
    }

    handleCancel();
  };

  const handleCancel = () => {
    setTitle('');
    setContent('');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const prompt = prompts.find(p => p.id === id);
    if (window.confirm(`Voulez-vous vraiment supprimer le prompt "${prompt?.title}" ?`)) {
      onDelete(id);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-white/60 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Bibliothèque de Prompts</h3>
            <p className="text-sm text-gray-500">Gérez vos raccourcis personnels</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isAdding ? (
            <form onSubmit={handleSubmit} className="space-y-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
              <h4 className="text-sm font-bold text-blue-900">{editingId ? 'Modifier le prompt' : 'Nouveau prompt'}</h4>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-blue-900 uppercase tracking-wider">Titre du raccourci</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Rapport hebdomadaire"
                  className="w-full px-4 py-2.5 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-blue-900 uppercase tracking-wider">Instruction (Prompt)</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Écrivez ici l'instruction que Nadia devra exécuter..."
                  className="w-full px-4 py-3 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white min-h-[120px] resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || !content.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-200"
                >
                  {editingId ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/30 transition-all group"
            >
              <div className="p-2 bg-gray-50 rounded-full group-hover:bg-blue-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-blue-600"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </div>
              <span className="font-semibold text-sm">Ajouter un nouveau prompt</span>
            </button>
          )}

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vos derniers prompts</h4>
            {prompts.length === 0 ? (
              <p className="text-center py-8 text-gray-400 italic text-sm">Aucun prompt enregistré pour le moment.</p>
            ) : (
              <div className="grid gap-3">
                {prompts.map((prompt) => (
                  <div 
                    key={prompt.id}
                    className="group bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-100 transition-all flex justify-between items-start"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <h5 className="font-bold text-gray-900 mb-1 truncate">{prompt.title}</h5>
                      <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{prompt.content}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => setEditingId(prompt.id)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Modifier"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                      <button
                        onClick={() => handleDelete(prompt.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Supprimer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/30">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
