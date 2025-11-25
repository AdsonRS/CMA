import React, { useState, useEffect } from 'react';
import { Module } from './types';
import { DownloadIcon } from './components/Icons';

interface ExportSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseModules: Module[];
    onConfirmExport: (selectedModuleIds: string[]) => void;
    initialSelectedIds: Set<string>;
}

export const ExportSelectionModal: React.FC<ExportSelectionModalProps> = ({
    isOpen,
    onClose,
    courseModules,
    onConfirmExport,
    initialSelectedIds,
}) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            setSelectedIds(new Set(initialSelectedIds));
        }
    }, [isOpen, initialSelectedIds]);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleConfirm = () => {
        onConfirmExport(Array.from(selectedIds));
    };

    if (!isOpen) return null;

    const allSelected = selectedIds.size === courseModules.length;
    const someSelected = selectedIds.size > 0 && selectedIds.size < courseModules.length;

    const toggleAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(courseModules.map(m => m.id)));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-brand-blue-dark border border-white/20 rounded-lg shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Selecionar Módulos para Exportar</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                
                <div className="p-4 overflow-y-auto flex-grow space-y-2">
                    {courseModules.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">Não há módulos no curso.</p>
                    ) : (
                        <>
                            <div 
                                onClick={toggleAll}
                                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                                    allSelected 
                                        ? 'bg-brand-orange/20 border-brand-orange' 
                                        : someSelected 
                                            ? 'bg-brand-blue/20 border-white/30'
                                            : 'bg-brand-blue border-transparent hover:bg-brand-blue/50'
                                }`}
                            >
                                <input 
                                    type="checkbox" 
                                    checked={allSelected}
                                    onChange={() => {}} // Controlled by div click
                                    className="w-5 h-5 text-brand-orange rounded focus:ring-brand-orange bg-brand-blue-dark border-gray-500"
                                    aria-label="Selecionar todos os módulos"
                                />
                                <div className="ml-3 overflow-hidden">
                                    <p className="text-white font-medium">Selecionar Todos</p>
                                    <p className="text-xs text-gray-400">{selectedIds.size} de {courseModules.length} selecionados</p>
                                </div>
                            </div>
                            <hr className="border-white/10 my-2" />
                            {courseModules.map(module => (
                                <div 
                                    key={module.id} 
                                    onClick={() => toggleSelection(module.id)}
                                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                                        selectedIds.has(module.id) 
                                            ? 'bg-green-500/20 border-green-500' 
                                            : 'bg-brand-blue border-transparent hover:bg-brand-blue/50'
                                    }`}
                                >
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIds.has(module.id)}
                                        onChange={() => {}} // Controlled by div click
                                        className="w-5 h-5 text-green-500 rounded focus:ring-green-500 bg-brand-blue-dark border-gray-500"
                                        aria-label={`Selecionar módulo ${module.title}`}
                                    />
                                    <div className="ml-3 overflow-hidden">
                                        <p className="text-white font-medium truncate">{module.title}</p>
                                        <p className="text-xs text-gray-400 uppercase">{module.type}</p>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                <div className="p-4 border-t border-white/10 bg-brand-blue-dark/50 flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-2 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="button"
                        onClick={handleConfirm}
                        disabled={selectedIds.size === 0}
                        className="flex-1 py-2 px-4 rounded-lg bg-brand-orange hover:bg-brand-orange/90 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <DownloadIcon />
                        Exportar ({selectedIds.size})
                    </button>
                </div>
            </div>
        </div>
    );
};
