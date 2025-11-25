
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Course } from './types';
import { TrashIcon, CloudUploadIcon } from './components/Icons';

declare const pdfjsLib: any;

interface AICourseCreatorPageProps {
    onCourseCreated: (course: Course) => void;
    onBack: () => void;
    createNewCourse: () => Course;
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


const courseGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        courseName: { type: Type.STRING, description: "O nome do curso gerado." },
        modules: {
            type: Type.ARRAY,
            description: "A lista de módulos do curso.",
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
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            text: { type: Type.STRING },
                                        },
                                        required: ['text']
                                    }
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
                            properties: {
                                front: { type: Type.STRING },
                                back: { type: Type.STRING },
                            },
                            required: ['front', 'back']
                        }
                    },
                },
                required: ['title', 'type']
            }
        }
    },
    required: ['courseName', 'modules']
};


export const AICourseCreatorPage: React.FC<AICourseCreatorPageProps> = ({ onCourseCreated, onBack, createNewCourse }) => {
    const [sources, setSources] = useState<Source[]>([]);
    const [prompt, setPrompt] = useState('');
    const [mode, setMode] = useState<GenerationMode>('fast');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [targetSourceId, setTargetSourceId] = useState<number | null>(null);
    const [dragActive, setDragActive] = useState(false);

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
        if (sources.length === 0 || !prompt) {
            setError("Por favor, adicione ao menos uma fonte e um prompt.");
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


            const fullPrompt = `Sua tarefa principal é criar um curso educacional completo estritamente com base nos MATERIAIS DE FONTE fornecidos. Use o PROMPT DO USUÁRIO apenas como um guia para a estrutura, tom e público-alvo do curso. O conteúdo principal DEVE vir dos materiais de fonte.

PROMPT DO USUÁRIO:
${prompt}

MATERIAIS DE FONTE:
${sourceMaterials}
`;
            
            const systemInstruction = `Você é um designer instrucional especialista. Sua tarefa é criar um curso educacional estruturado com base nos materiais e instruções fornecidas. A saída DEVE ser um objeto JSON válido que adere ao esquema fornecido. O JSON deve representar um curso completo com um nome de curso e uma lista de módulos. Para módulos de texto, use HTML simples para formatação (ex: <p>, <ul>, <li>, <strong>). Para módulos de vídeo, você DEVE encontrar uma URL de vídeo real e relevante no YouTube.`;

            const config: any = {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: courseGenerationSchema,
            };

            const response = await ai.models.generateContent({
                model: modelName,
                contents: fullPrompt,
                config: config,
            });
            
            const generatedData = JSON.parse(response.text);

            const newCourse = createNewCourse();
            newCourse.settings.courseName = generatedData.courseName;
            newCourse.modules = generatedData.modules.map((mod: any) => {
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
                            return {
                                ...q,
                                id: qId,
                                options,
                                correctOptionId: options[q.correctOptionIndex]?.id || ''
                            };
                        })
                    };
                }
                if (mod.type === 'cards' && mod.cards) {
                     return { ...baseModule, cards: mod.cards.map((c: any) => ({ ...c, id: `c_${Date.now()}_${Math.random()}` })) };
                }
                return { ...baseModule, ...mod };
            });

            onCourseCreated(newCourse);

        } catch (e) {
            console.error("Erro ao gerar curso:", e);
            setError("Ocorreu um erro ao gerar o curso. Verifique sua chave de API ou tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const SourceTypeButton: React.FC<{label: string, active: boolean, onClick: () => void}> = ({label, active, onClick}) => (
        <button onClick={onClick} className={`px-3 py-1 text-sm rounded-t-md ${active ? 'bg-brand-blue text-white' : 'bg-brand-blue-dark/50 text-gray-400 hover:bg-brand-blue-dark'}`}>
            {label}
        </button>
    );

    return (
        <div className="flex flex-col h-screen bg-brand-blue font-sans text-white">
             <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.txt,.md" />
            {isLoading && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-50">
                    <div className="w-16 h-16 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-xl">Gerando seu curso... Isso pode levar alguns minutos.</p>
                </div>
            )}

            <header className="bg-brand-blue-dark p-3 flex justify-between items-center shadow-md">
                <h1 className="text-2xl font-bold text-brand-orange">Criar Curso com IA</h1>
                <button onClick={onBack} className="bg-white/10 hover:bg-white/20 font-bold py-2 px-4 rounded transition-colors">Voltar</button>
            </header>

            <main className="flex-grow p-6 overflow-y-auto space-y-8">
                <div>
                    <h2 className="text-xl font-semibold mb-3">1. Fontes de Conteúdo (Até 10)</h2>
                    <div className="space-y-4">
                        {sources.map(source => (
                            <div key={source.id} className="bg-brand-blue-dark p-4 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <input type="text" value={source.title} onChange={(e) => handleUpdateSource(source.id, { title: e.target.value })} className="bg-transparent text-lg font-bold w-full focus:outline-none"/>
                                    <button onClick={() => handleRemoveSource(source.id)} className="text-red-400 hover:text-red-300 ml-4"><TrashIcon /></button>
                                </div>
                                <div className="flex gap-1 border-b border-brand-blue">
                                    <SourceTypeButton label="Arquivo" active={source.type === 'file'} onClick={() => handleUpdateSource(source.id, {type: 'file'})} />
                                    <SourceTypeButton label="Texto" active={source.type === 'text'} onClick={() => handleUpdateSource(source.id, {type: 'text'})} />
                                </div>
                                <div className="bg-brand-blue p-3 rounded-b-md">
                                    {source.type === 'file' && (
                                         <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={(e) => handleDrop(e, source.id)} onClick={() => handleFileUploadClick(source.id)}
                                              className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md cursor-pointer transition-colors ${dragActive ? 'border-brand-orange bg-brand-orange/10' : 'border-white/20 hover:bg-white/5'}`}>
                                            {source.status === 'empty' && <><CloudUploadIcon /><p className="mt-2 text-sm text-gray-400">Arraste um arquivo ou clique para selecionar</p><p className="text-xs text-gray-500">.pdf, .txt, .md</p></>}
                                            {source.status === 'loading' && <p>Carregando: {source.fileName}...</p>}
                                            {source.status === 'loaded' && <div className="text-center"><p className="font-semibold text-brand-orange">Arquivo Carregado:</p><p>{source.fileName}</p></div>}
                                            {source.status === 'error' && <p className="text-red-400">Erro ao carregar o arquivo.</p>}
                                        </div>
                                    )}
                                    {source.type === 'text' && (
                                         <textarea value={source.content} onChange={(e) => handleUpdateSource(source.id, { content: e.target.value })} placeholder="Cole o conteúdo aqui..." className="w-full h-24 bg-brand-blue-light/30 border border-white/20 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-orange"></textarea>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    {sources.length < 10 && (
                        <button onClick={handleAddSource} className="mt-4 bg-brand-orange/20 hover:bg-brand-orange/40 text-brand-orange font-bold py-2 px-4 rounded transition-colors">
                            + Adicionar Fonte
                        </button>
                    )}
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-3">2. Prompt de Geração</h2>
                    <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Descreva o curso que você quer criar. Inclua o público-alvo, o tom desejado, os principais tópicos e a estrutura geral (ex: 'Crie um curso sobre fotossíntese para o 9º ano, com um quiz no final. Use uma linguagem simples e didática.')." className="w-full h-40 bg-brand-blue-dark border border-white/20 rounded p-2 focus:outline-none focus:ring-1 focus:ring-brand-orange"></textarea>
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-3">3. Modo de Geração</h2>
                    <div className="flex gap-4">
                        <div onClick={() => setMode('fast')} className={`cursor-pointer flex-1 p-4 rounded-lg border-2 ${mode === 'fast' ? 'border-brand-orange bg-brand-orange/20' : 'border-brand-blue-dark hover:bg-brand-blue-dark'}`}>
                            <h3 className="font-bold">Geração Rápida</h3>
                            <p className="text-sm text-gray-300">Focada em velocidade, ideal para rascunhos. (Usa Gemini 2.5 Flash)</p>
                        </div>
                        <div onClick={() => setMode('complex')} className={`cursor-pointer flex-1 p-4 rounded-lg border-2 ${mode === 'complex' ? 'border-brand-orange bg-brand-orange/20' : 'border-brand-blue-dark hover:bg-brand-blue-dark'}`}>
                            <h3 className="font-bold">Geração Complexa</h3>
                            <p className="text-sm text-gray-300">Análise profunda para um curso mais detalhado. (Usa Gemini 3.0 Pro)</p>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="bg-brand-blue-dark p-4">
                 {error && <p className="text-red-400 text-center mb-4">{error}</p>}
                <button onClick={handleSubmit} disabled={isLoading || sources.length === 0 || !prompt} className="w-full bg-brand-orange hover:opacity-90 text-white font-bold py-3 px-4 rounded transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
                    {isLoading ? 'Gerando...' : 'Gerar Curso'}
                </button>
            </footer>
        </div>
    );
};
