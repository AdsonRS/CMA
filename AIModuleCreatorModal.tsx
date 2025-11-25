
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Course, Module } from './types';
import { TrashIcon, CloudUploadIcon } from './components/Icons';

declare const pdfjsLib: any;

interface AIModuleCreatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onModulesCreated: (modules: Module[]) => void;
    course: Course;
}

type SourceType = 'file' | 'text';
type SourceStatus = 'empty' | 'loading' | 'loaded' | 'error';
type Source = {
    id: number;
    type: SourceType;
    title: string;
    content: string;
    url: string;
    fileName: string;
    status: SourceStatus;
};

type GenerationMode = 'fast' | 'complex';

const moduleGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        modules: {
            type: Type.ARRAY,
            description: "A lista de módulos gerados.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['text', 'quiz', 'cards', 'video'] },
                    content: { type: Type.STRING, description: 'Conteúdo HTML para o módulo de texto.' },
                    source: { type: Type.STRING, enum: ['url'], description: 'Para módulos de vídeo, use sempre "url".' },
                    url: { type: Type.STRING, description: 'Para módulos de vídeo, uma URL para um vídeo relevante (ex: YouTube).' },
                    questions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                question: { type: Type.STRING },
                                options: {
                                    type: Type.ARRAY,
                                    items: { type: Type.OBJECT, properties: { text: { type: Type.STRING } }, required: ['text'] }
                                },
                                correctOptionIndex: { type: Type.INTEGER, description: "O índice (base 0) da alternativa correta." },
                                explanation: { type: Type.STRING },
                            },
                            required: ['question', 'options', 'correctOptionIndex']
                        }
                    },
                    cards: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: { front: { type: Type.STRING }, back: { type: Type.STRING } },
                            required: ['front', 'back']
                        }
                    },
                },
                required: ['title', 'type']
            }
        }
    },
    required: ['modules']
};

export const AIModuleCreatorModal: React.FC<AIModuleCreatorModalProps> = ({ isOpen, onClose, onModulesCreated, course }) => {
    const [sources, setSources] = useState<Source[]>([]);
    const [prompt, setPrompt] = useState('');
    const [numModules, setNumModules] = useState(3);
    const [mode, setMode] = useState<GenerationMode>('fast');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [targetSourceId, setTargetSourceId] = useState<number | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const modalContentRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        if (!isOpen) {
            setSources([]);
            setPrompt('');
            setNumModules(3);
            setMode('fast');
            setError(null);
            setIsLoading(false);
        }
    }, [isOpen]);

    const handleAddSource = () => {
        const newSource: Source = {
            id: Date.now(),
            type: 'file',
            title: `Nova Fonte ${sources.length + 1}`,
            content: '',
            url: '',
            fileName: '',
            status: 'empty',
        };
        setSources([...sources, newSource]);
    };

    const handleRemoveSource = (id: number) => {
        setSources(sources.filter(s => s.id !== id));
    };

    const handleUpdateSource = (id: number, data: Partial<Source>) => {
        setSources(sources => sources.map(s => s.id === id ? { ...s, ...data } : s));
    };

    const handleFileUploadClick = (sourceId: number) => {
        setTargetSourceId(sourceId);
        fileInputRef.current?.click();
    };

     const processFile = async (file: File, sourceId: number) => {
        handleUpdateSource(sourceId, { status: 'loading', fileName: file.name, title: file.name });

        try {
            let textContent = '';
            if (file.type === 'application/pdf') {
                const loadingTask = pdfjsLib.getDocument(URL.createObjectURL(file));
                const pdf = await loadingTask.promise;
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContentItems = await page.getTextContent();
                    const pageText = textContentItems.items.map((item: any) => item.str).join(' ');
                    textContent += pageText + '\n\n';
                }
            } else { // Assume text file
                textContent = await file.text();
            }
            handleUpdateSource(sourceId, { content: textContent, status: 'loaded' });
        } catch (error) {
            console.error('Erro ao ler o arquivo:', error);
            handleUpdateSource(sourceId, { content: 'Erro ao ler o arquivo.', status: 'error' });
        } finally {
            setTargetSourceId(null);
        }
    };
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || targetSourceId === null) return;
        processFile(file, targetSourceId);
        if (event.target) event.target.value = '';
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent, sourceId: number) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file, sourceId);
        }
    };

    const handleSubmit = async () => {
        if (!prompt) {
            setError("Por favor, adicione um prompt.");
            return;
        }

        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            setError("Chave de API não encontrada.");
            return;
        }

        setError(null);
        setIsLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey });
            const modelName = mode === 'fast' ? 'gemini-2.5-flash' : 'gemini-3-pro-preview';
            
            const sourceMaterials = sources.map(s => {
                if ((s.type === 'file' && s.status === 'loaded') || (s.type === 'text' && s.content)) {
                    return `--- Fonte: ${s.title} ---\n${s.content}`;
                }
                return '';
            }).filter(Boolean).join('\n\n');

            const existingModulesContext = course.modules.length > 0
                ? `Os módulos existentes são:\n${course.modules.map(m => `- ${m.title}`).join('\n')}`
                : "Este é o primeiro módulo do curso.";

            const fullPrompt = `Sua tarefa principal é criar novos módulos educacionais estritamente com base nos MATERIAIS DE FONTE ADICIONAIS, se fornecidos. O conteúdo principal dos novos módulos DEVE vir dos materiais de fonte. Use o PROMPT DO USUÁRIO e o CONTEXTO DO CURSO ATUAL como guias para garantir que os novos módulos se encaixem bem na estrutura existente do curso.

CONTEXTO DO CURSO ATUAL:
O curso se chama "${course.settings.courseName}".
${existingModulesContext}

PROMPT DO USUÁRIO:
${prompt}

${sourceMaterials ? `MATERIAIS DE FONTE ADICIONAIS:\n${sourceMaterials}` : ''}

INSTRUÇÕES DE GERAÇÃO:
- Gere exatamente ${numModules} novos módulos.
- Os módulos devem continuar ou expandir os tópicos do curso existente, seguindo o prompt do usuário.
- A saída DEVE ser um objeto JSON válido que adere ao esquema fornecido, contendo uma chave "modules" com um array dos módulos gerados.
- Para módulos de texto, use HTML simples para formatação (ex: <p>, <ul>, <li>, <strong>).
- Para módulos de vídeo, encontre URLs de vídeos reais e relevantes no YouTube.`;

            const systemInstruction = "Você é um designer instrucional especialista que cria módulos de curso em formato JSON estruturado.";

            const config: any = {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: moduleGenerationSchema,
            };

            const response = await ai.models.generateContent({
                model: modelName,
                contents: fullPrompt,
                config,
            });

            const generatedData = JSON.parse(response.text);
            const rawModules = generatedData.modules || [];

            const newModules: Module[] = rawModules.map((mod: any) => {
                const baseModule = {
                    id: `mod_${Date.now()}_${Math.random()}`,
                    title: mod.title,
                    type: mod.type,
                };
                if (mod.type === 'quiz' && mod.questions) {
                    return {
                        ...baseModule,
                        questions: mod.questions.map((q: any) => {
                            const qId = `q_${Date.now()}_${Math.random()}`;
                            const options = q.options.map((opt: any) => ({ ...opt, id: `o_${Date.now()}_${Math.random()}` }));
                            return { ...q, id: qId, options, correctOptionId: options[q.correctOptionIndex]?.id || '' };
                        })
                    };
                }
                if (mod.type === 'cards' && mod.cards) {
                    return { ...baseModule, cards: mod.cards.map((c: any) => ({ ...c, id: `c_${Date.now()}_${Math.random()}` })) };
                }
                return { ...baseModule, ...mod };
            });

            onModulesCreated(newModules);
            onClose();

        } catch (e) {
            console.error("Erro ao gerar módulos:", e);
            setError("Ocorreu um erro ao gerar os módulos. Verifique sua chave de API.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const SourceTypeButton: React.FC<{label: string, active: boolean, onClick: () => void}> = ({label, active, onClick}) => (
        <button onClick={onClick} className={`px-2 py-1 text-xs rounded-t-md ${active ? 'bg-brand-blue text-white' : 'bg-brand-blue-dark/50 text-gray-400 hover:bg-brand-blue-dark'}`}>
            {label}
        </button>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4" >
             <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.txt,.md" />
            {isLoading && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-50">
                    <div className="w-16 h-16 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-xl">Gerando módulos...</p>
                </div>
            )}
            <div ref={modalContentRef} className="bg-brand-blue-dark rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-white/10 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-brand-orange">Gerar Módulos com IA</h2>
                    <button onClick={onClose} className="text-2xl text-gray-400 hover:text-white">&times;</button>
                </header>
                
                <main className="flex-grow p-6 overflow-y-auto space-y-6">
                     <div>
                        <h3 className="text-lg font-semibold mb-2">1. Fontes de Conteúdo (Opcional)</h3>
                        <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                             {sources.map(source => (
                                <div key={source.id} className="bg-brand-blue/80 p-3 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <input type="text" value={source.title} onChange={(e) => handleUpdateSource(source.id, { title: e.target.value })} className="bg-transparent font-bold w-full focus:outline-none"/>
                                        <button onClick={() => handleRemoveSource(source.id)} className="text-red-400 hover:text-red-300 ml-4 flex-shrink-0"><TrashIcon /></button>
                                    </div>
                                    <div className="flex gap-1 border-b border-brand-blue-dark">
                                        <SourceTypeButton label="Arquivo" active={source.type === 'file'} onClick={() => handleUpdateSource(source.id, {type: 'file'})} />
                                        <SourceTypeButton label="Texto" active={source.type === 'text'} onClick={() => handleUpdateSource(source.id, {type: 'text'})} />
                                    </div>
                                    <div className="bg-brand-blue-dark p-2 rounded-b-md">
                                        {source.type === 'file' && (
                                            <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={(e) => handleDrop(e, source.id)} onClick={() => handleFileUploadClick(source.id)}
                                                className={`relative flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md cursor-pointer transition-colors ${dragActive ? 'border-brand-orange bg-brand-orange/10' : 'border-white/20 hover:bg-white/5'}`}>
                                                {source.status === 'empty' && <><CloudUploadIcon /><p className="mt-2 text-xs text-gray-400">Arraste um arquivo ou clique</p></>}
                                                {source.status === 'loading' && <p className="text-sm">Carregando...</p>}
                                                {source.status === 'loaded' && <div className="text-center text-sm"><p className="font-semibold text-brand-orange">Carregado:</p><p className="text-xs truncate">{source.fileName}</p></div>}
                                                {source.status === 'error' && <p className="text-red-400 text-sm">Erro.</p>}
                                            </div>
                                        )}
                                        {source.type === 'text' && (
                                            <textarea value={source.content} onChange={(e) => handleUpdateSource(source.id, { content: e.target.value })} placeholder="Cole o conteúdo..." className="w-full h-20 bg-brand-blue border border-white/20 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-orange"></textarea>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {sources.length < 5 && (
                            <button onClick={handleAddSource} className="mt-2 text-sm text-brand-orange hover:underline font-bold">
                                + Adicionar Fonte
                            </button>
                        )}
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-2">2. Prompt de Geração</h3>
                         <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="O que você quer criar? Ex: 'Crie um módulo de quiz sobre os tipos de células, com 5 perguntas difíceis.'" className="w-full h-32 bg-brand-blue/80 border border-white/20 rounded p-3 focus:outline-none focus:ring-1 focus:ring-brand-orange text-white"></textarea>
                    </div>

                    <div className="flex gap-6">
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2">3. Qtd. Módulos</h3>
                            <input type="number" min="1" max="5" value={numModules} onChange={(e) => setNumModules(parseInt(e.target.value))} className="w-full bg-brand-blue/80 border border-white/20 rounded p-3 focus:outline-none focus:ring-1 focus:ring-brand-orange text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2">4. Modo</h3>
                             <select value={mode} onChange={(e) => setMode(e.target.value as GenerationMode)} className="w-full bg-brand-blue/80 border border-white/20 rounded p-3 focus:outline-none focus:ring-1 focus:ring-brand-orange text-white">
                                <option value="fast">Rápido (Flash)</option>
                                <option value="complex">Complexo (Pro)</option>
                            </select>
                        </div>
                    </div>
                </main>
                
                <footer className="p-4 border-t border-white/10 flex justify-end gap-3 flex-shrink-0">
                    {error && <p className="text-red-400 mr-auto self-center text-sm">{error}</p>}
                    <button onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-white/10 text-white transition-colors">Cancelar</button>
                    <button onClick={handleSubmit} disabled={isLoading || !prompt} className="px-6 py-2 bg-brand-orange hover:bg-brand-orange/90 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                        {isLoading ? 'Gerando...' : 'Gerar'}
                    </button>
                </footer>
            </div>
        </div>
    );
};
