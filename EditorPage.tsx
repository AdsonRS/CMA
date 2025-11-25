import React, { useState, useRef, useEffect } from 'react';
import { Course, Module, ModuleType, MascotPose, TextModule, VideoModule, QuizModule, CardsModule } from './types';
import { TrashIcon, DuplicateIcon, ArrowUpIcon, ArrowDownIcon, CloudUploadIcon, PlusIcon } from './components/Icons';
import { ExportSelectionModal } from './ExportSelectionModal';

type EditorView = 'modules' | 'mascot';

interface EditorPageProps {
  course: Course;
  setCourse: React.Dispatch<React.SetStateAction<Course | null>>;
  onOpenExportSelectionModal: () => void;
}

const Sidebar: React.FC<{
    course: Course,
    setCourse: React.Dispatch<React.SetStateAction<Course | null>>,
    selectedModuleId: string | null,
    setSelectedModuleId: (id: string | null) => void,
    setActiveView: (view: EditorView) => void,
    activeView: EditorView,
}> = ({ course, setCourse, selectedModuleId, setSelectedModuleId, setActiveView, activeView }) => {
    const [isAddModuleMenuOpen, setIsAddModuleMenuOpen] = useState(false);
    const addModuleMenuRef = useRef<HTMLDivElement>(null);

    const addModule = (type: ModuleType) => {
        let newModule: Module;
        const commonProps = {
            id: `mod_${Date.now()}`,
            title: `Novo Módulo`,
        };

        switch (type) {
            case 'text':
                newModule = { ...commonProps, type, title: 'Novo Texto', content: '<p>Comece a escrever...</p>' };
                break;
            case 'video':
                newModule = { ...commonProps, type, title: 'Novo Vídeo', source: 'url', url: '' };
                break;
            case 'quiz':
                newModule = { ...commonProps, type, title: 'Novo Quiz', questions: [] };
                break;
            case 'cards':
                newModule = { ...commonProps, type, title: 'Novos Cards', cards: [] };
                break;
            default:
                return;
        }

        const updatedCourse = { ...course, modules: [...course.modules, newModule] };
        setCourse(updatedCourse);
        setSelectedModuleId(newModule.id);
        setActiveView('modules');
        setIsAddModuleMenuOpen(false);
    };
    
    const duplicateModule = (moduleId: string) => {
        const moduleToDuplicate = course.modules.find(m => m.id === moduleId);
        if (!moduleToDuplicate) return;
        const newModule = { ...moduleToDuplicate, id: `mod_${Date.now()}`, title: `${moduleToDuplicate.title} (Cópia)` };
        const index = course.modules.findIndex(m => m.id === moduleId);
        const newModules = [...course.modules];
        newModules.splice(index + 1, 0, newModule);
        setCourse({ ...course, modules: newModules });
    };

    const moveModule = (moduleId: string, direction: 'up' | 'down') => {
        const index = course.modules.findIndex(m => m.id === moduleId);
        if (index === -1) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === course.modules.length - 1) return;

        const newModules = [...course.modules];
        const item = newModules.splice(index, 1)[0];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        newModules.splice(newIndex, 0, item);
        setCourse({ ...course, modules: newModules });
    };
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (addModuleMenuRef.current && !addModuleMenuRef.current.contains(event.target as Node)) {
                setIsAddModuleMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <>
            <aside className="w-80 bg-brand-blue-dark flex flex-col border-r border-white/10 flex-shrink-0 h-full">
                <div className="p-4 border-b border-white/10">
                    <h2 className="text-xl font-bold text-brand-orange">Estrutura do Curso</h2>
                </div>
                
                <div className="flex-grow overflow-y-auto p-2 space-y-2">
                    {course.modules.map(module => (
                        <div key={module.id} 
                             className={`group p-3 rounded-lg cursor-pointer transition-all border ${selectedModuleId === module.id && activeView === 'modules' ? 'bg-brand-orange border-brand-orange text-white shadow-lg' : 'bg-brand-blue/30 border-transparent hover:bg-brand-blue/50 text-gray-300 hover:text-white'}`}
                             onClick={() => {
                                setActiveView('modules');
                                setSelectedModuleId(module.id);
                             }}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs uppercase font-bold opacity-60 tracking-wider">{module.type}</span>
                            </div>
                            <p className="font-semibold truncate">{module.title}</p>
                            
                            <div className={`flex items-center justify-end space-x-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity ${selectedModuleId === module.id ? 'opacity-100' : ''}`}>
                               <button onClick={(e) => {e.stopPropagation(); moveModule(module.id, 'up')}} className="p-1 hover:bg-black/20 rounded" title="Mover para cima"><ArrowUpIcon /></button>
                               <button onClick={(e) => {e.stopPropagation(); moveModule(module.id, 'down')}} className="p-1 hover:bg-black/20 rounded" title="Mover para baixo"><ArrowDownIcon /></button>
                               <button onClick={(e) => {e.stopPropagation(); duplicateModule(module.id)}} className="p-1 hover:bg-black/20 rounded" title="Duplicar"><DuplicateIcon /></button>
                            </div>
                        </div>
                    ))}
                    
                    {course.modules.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            Nenhum módulo criado.<br/>Adicione um módulo abaixo.
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/10 bg-brand-blue-dark/50 space-y-3">
                    <div className="relative" ref={addModuleMenuRef}>
                        <button 
                            onClick={() => setIsAddModuleMenuOpen(prev => !prev)}
                            className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                        >
                            <PlusIcon />
                            Adicionar Módulo
                        </button>
                        {isAddModuleMenuOpen && (
                             <div className="absolute bottom-full mb-2 w-full bg-white rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                                {(['text', 'video', 'quiz', 'cards'] as ModuleType[]).map(type => (
                                    <button key={type} onClick={() => addModule(type)} className="w-full text-left px-4 py-3 text-brand-blue-dark hover:bg-brand-orange/10 hover:text-brand-orange font-medium capitalize transition-colors border-b border-gray-100 last:border-0">
                                        {type === 'text' ? 'Texto' : type === 'video' ? 'Vídeo' : type === 'quiz' ? 'Quiz' : 'Cards'}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-2 pt-4 border-t border-white/10">
                        <h3 className="text-gray-400 font-bold mb-3 text-xs uppercase tracking-wider">Configurações</h3>
                        <button 
                            className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${activeView === 'mascot' ? 'bg-brand-orange text-white shadow-md' : 'hover:bg-white/5 text-gray-300'}`}
                            onClick={() => setActiveView('mascot')}
                        >
                            <span className="text-2xl">🦖</span>
                            <span className="font-semibold">Personalizar Mascote</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

const MascotEditor: React.FC<{ course: Course, setCourse: React.Dispatch<React.SetStateAction<Course | null>> }> = ({ course, setCourse }) => {
    const poses = [
        { id: 'happy', label: 'Alegre', bgUrl: 'https://i.imgur.com/oaZ8vKr.png' },
        { id: 'explaining', label: 'Comemorando', bgUrl: 'https://i.imgur.com/6FPSrbo.png' },
        { id: 'sad', label: 'Triste', bgUrl: 'https://i.imgur.com/QrjBlYr.png' },
        { id: 'thinking', label: 'Pensando', bgUrl: 'https://i.imgur.com/rsV4LAc.png' },
    ];

    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCourse(prev => prev ? { ...prev, settings: { ...prev.settings, mascotName: e.target.value } } : null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, poseType: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (file.type !== 'image/png') {
            alert('Por favor, envie apenas arquivos PNG.');
            return;
        }

        const blobUrl = URL.createObjectURL(file);
        const newMascotPose: MascotPose = {
            type: poseType,
            path: `mascot/${poseType}.png`,
            blobUrl,
            file
        };

        setCourse(prev => {
            if (!prev) return null;
            const existingMascot = prev.mascot.filter(m => m.type !== poseType);
            return {
                ...prev,
                mascot: [...existingMascot, newMascotPose]
            };
        });
    };

    const triggerFileInput = (poseType: string) => {
        fileInputRefs.current[poseType]?.click();
    };

    const removePose = (poseType: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setCourse(prev => {
            if (!prev) return null;
            return {
                ...prev,
                mascot: prev.mascot.filter(m => m.type !== poseType)
            };
        });
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Personalizar Mascote</h2>
                <p className="text-gray-300 mb-4">
                    Defina o nome e envie as poses do mascote. Caso não envie, será usado o padrão (sem mascote) ou a referência de fundo.
                </p>
                
                <div className="bg-blue-500/20 border border-blue-500/50 p-4 rounded-lg text-sm text-blue-100">
                    <p className="font-bold mb-1">⚠ Requisitos da Imagem:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Formato: <strong>Apenas PNG</strong> (Fundo transparente).</li>
                        <li>Proporção: <strong>Quadrada (1:1)</strong>.</li>
                        <li>A imagem será redimensionada automaticamente para <strong>1500x1500px</strong> na exportação.</li>
                        <li>Garanta que o mascote não tenha fundo para melhor integração no app do aluno.</li>
                    </ul>
                </div>
            </div>
            
            <div className="bg-brand-blue-dark/50 p-6 rounded-xl border border-white/10 mb-8">
                <label className="block text-sm font-bold text-brand-orange mb-2 uppercase tracking-wide">Nome do Mascote</label>
                <input 
                    type="text" 
                    value={course.settings.mascotName || ''} 
                    onChange={handleNameChange}
                    placeholder="Ex: Curiossauro"
                    className="w-full bg-brand-blue border border-white/20 rounded-lg p-3 text-white text-lg focus:outline-none focus:ring-2 focus:ring-brand-orange transition-all placeholder-white/30"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {poses.map((pose) => {
                    const currentPose = course.mascot.find(m => m.type === pose.id);
                    
                    return (
                        <div key={pose.id} className="bg-brand-blue-dark/50 p-4 rounded-xl border border-white/10 hover:border-white/30 transition-colors">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-white text-lg">{pose.label}</h3>
                                {currentPose && <span className="text-green-400 text-xs font-bold uppercase bg-green-400/10 px-2 py-1 rounded">Definido</span>}
                            </div>
                            
                            <div 
                                onClick={() => triggerFileInput(pose.id)}
                                className="relative w-full aspect-square rounded-lg border-2 border-dashed border-white/20 bg-black/20 cursor-pointer overflow-hidden group hover:border-brand-orange transition-all"
                            >
                                {/* Background Reference Image */}
                                <div 
                                    className={`absolute inset-0 bg-contain bg-center bg-no-repeat transition-all duration-500 ${currentPose ? 'opacity-0' : 'opacity-40 group-hover:opacity-30 filter grayscale group-hover:grayscale-0'}`}
                                    style={{ backgroundImage: `url(${pose.bgUrl})` }}
                                />
                                
                                {/* Content */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4">
                                    {currentPose ? (
                                        <div className="relative w-full h-full flex items-center justify-center">
                                            <img src={currentPose.blobUrl} alt={pose.label} className="max-w-full max-h-full object-contain drop-shadow-lg" />
                                            
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity backdrop-blur-sm rounded-lg">
                                                <CloudUploadIcon />
                                                <span className="mt-2 font-bold text-white">Trocar PNG</span>
                                            </div>
                                            
                                            <button 
                                                onClick={(e) => removePose(pose.id, e)}
                                                className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white p-2 rounded-bl-lg shadow-lg z-20 transition-colors"
                                                title="Remover"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center text-gray-400 group-hover:text-brand-orange transition-colors">
                                            <div className="bg-brand-blue p-3 rounded-full mb-3 shadow-lg group-hover:scale-110 transition-transform">
                                                <CloudUploadIcon />
                                            </div>
                                            <span className="font-semibold">Clique para enviar PNG</span>
                                            <span className="text-xs opacity-70 mt-1 text-center">Transparente e Quadrado</span>
                                        </div>
                                    )}
                                </div>
                                
                                <input 
                                    type="file" 
                                    ref={el => { fileInputRefs.current[pose.id] = el; }}
                                    onChange={(e) => handleFileChange(e, pose.id)}
                                    accept="image/png"
                                    className="hidden" 
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const TextModuleEditor: React.FC<{ module: TextModule, onUpdate: (module: TextModule) => void }> = ({ module, onUpdate }) => {
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== module.content) {
            editorRef.current.innerHTML = module.content;
        }
    }, [module.id]); // Only re-run if module ID changes, to avoid cursor jumps

    const handleBlur = () => {
        const editor = editorRef.current;
        if (editor && module.content !== editor.innerHTML) {
            onUpdate({ ...module, content: editor.innerHTML });
        }
    };

    const execCmd = (command: string, value?: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false, value);
        handleBlur();
    };
    
    const ToolbarButton: React.FC<{onClick: (e: React.MouseEvent<HTMLButtonElement>) => void, title: string, children: React.ReactNode}> = ({ onClick, title, children }) => (
        <button
            type="button"
            title={title}
            onMouseDown={e => e.preventDefault()}
            onClick={onClick}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded text-gray-300 hover:text-white transition-colors"
        >
            {children}
        </button>
    );

    return (
        <div className="space-y-4">
             <div>
                <label className="block text-sm font-bold text-brand-orange mb-1 uppercase tracking-wide">Título do Módulo</label>
                <input type="text" value={module.title} onChange={(e) => onUpdate({ ...module, title: e.target.value })} className="w-full bg-brand-blue-dark border border-white/20 rounded-lg p-3 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-brand-orange transition-all" />
            </div>
            
            <div className="bg-brand-blue-dark border border-white/20 rounded-lg overflow-hidden flex flex-col h-[calc(100vh-250px)]">
                <div className="p-2 border-b border-white/20 flex flex-wrap items-center gap-1 bg-brand-blue-dark/80">
                     <ToolbarButton onClick={() => execCmd('bold')} title="Negrito (Ctrl+B)">
                        <span className="font-bold text-lg">B</span>
                    </ToolbarButton>
                    <ToolbarButton onClick={() => execCmd('italic')} title="Itálico (Ctrl+I)">
                        <span className="italic text-lg font-serif">I</span>
                    </ToolbarButton>
                    <ToolbarButton onClick={() => execCmd('underline')} title="Sublinhado (Ctrl+U)">
                         <span className="underline text-lg">U</span>
                    </ToolbarButton>
                    <ToolbarButton onClick={() => execCmd('strikeThrough')} title="Tachado">
                         <span className="line-through text-lg">S</span>
                    </ToolbarButton>
                    <div className="h-6 w-px bg-white/10 mx-2"></div>
                    <ToolbarButton onClick={() => execCmd('justifyLeft')} title="Alinhar Esquerda">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 21h18v-2H3v2zm0-4h12v-2H3v2zm0-4h18v-2H3v2zm0-4h12V7H3v2zm0-6v2h18V3H3z"/></svg>
                    </ToolbarButton>
                    <ToolbarButton onClick={() => execCmd('justifyCenter')} title="Centralizar">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M7 21h10v-2H7v2zM3 17h18v-2H3v2zm4-4h10v-2H7v2zM3 9h18V7H3v2zm4-4h10V3H7v2z"/></svg>
                    </ToolbarButton>
                </div>
                <div 
                    ref={editorRef} 
                    onBlur={handleBlur} 
                    contentEditable 
                    suppressContentEditableWarning 
                    className="flex-grow p-4 focus:outline-none overflow-y-auto prose prose-invert max-w-none"
                ></div>
            </div>
        </div>
    );
};

const VideoModuleEditor: React.FC<{ module: VideoModule, onUpdate: (module: VideoModule) => void }> = ({ module, onUpdate }) => {
    return (
        <div className="space-y-6">
             <div>
                <label className="block text-sm font-bold text-brand-orange mb-1 uppercase tracking-wide">Título do Módulo</label>
                <input type="text" value={module.title} onChange={(e) => onUpdate({ ...module, title: e.target.value })} className="w-full bg-brand-blue-dark border border-white/20 rounded-lg p-3 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-brand-orange transition-all" />
            </div>

            <div className="bg-brand-blue-dark p-6 rounded-xl border border-white/10">
                 <label className="block text-sm font-bold text-gray-300 mb-4">Fonte do Vídeo</label>
                 
                 <div className="flex gap-6 mb-6">
                    <label className="flex items-center cursor-pointer">
                        <input 
                            type="radio" 
                            name={`source-${module.id}`} 
                            value="url" 
                            checked={module.source === 'url'} 
                            onChange={() => onUpdate({ ...module, source: 'url'})} 
                            className="w-5 h-5 text-brand-orange bg-brand-blue border-gray-500 focus:ring-brand-orange focus:ring-offset-brand-blue-dark" 
                        />
                        <span className="ml-2 text-white">URL (YouTube, Vimeo)</span>
                    </label>
                 </div>

                 {module.source === 'url' && (
                     <div>
                        <label className="block text-sm text-gray-400 mb-2">Link do Vídeo</label>
                        <input 
                            type="text" 
                            value={module.url || ''} 
                            onChange={(e) => onUpdate({ ...module, url: e.target.value })} 
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="w-full bg-brand-blue border border-white/20 rounded p-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-orange transition-all"
                        />
                        {module.url && (
                            <div className="mt-4 aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
                                <iframe 
                                    width="100%" 
                                    height="100%" 
                                    src={module.url.replace('watch?v=', 'embed/')} 
                                    title="Video Preview" 
                                    frameBorder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowFullScreen
                                ></iframe>
                            </div>
                        )}
                     </div>
                 )}
            </div>
        </div>
    );
};

const QuizModuleEditor: React.FC<{ module: QuizModule, onUpdate: (module: QuizModule) => void }> = ({ module, onUpdate }) => {
    const addQuestion = () => {
        const newQuestion = {
            id: `q_${Date.now()}`,
            question: 'Nova Pergunta',
            options: [
                { id: `opt_${Date.now()}_1`, text: 'Opção 1' },
                { id: `opt_${Date.now()}_2`, text: 'Opção 2' }
            ],
            correctOptionId: `opt_${Date.now()}_1`,
            explanation: ''
        };
        onUpdate({ ...module, questions: [...module.questions, newQuestion] });
    };

    const updateQuestion = (qId: string, field: string, value: any) => {
        const updatedQuestions = module.questions.map(q => {
            if (q.id === qId) return { ...q, [field]: value };
            return q;
        });
        onUpdate({ ...module, questions: updatedQuestions });
    };

    const addOption = (qId: string) => {
        const updatedQuestions = module.questions.map(q => {
            if (q.id === qId) {
                const newOptId = `opt_${Date.now()}`;
                return { ...q, options: [...q.options, { id: newOptId, text: `Opção ${q.options.length + 1}` }] };
            }
            return q;
        });
        onUpdate({ ...module, questions: updatedQuestions });
    };

    const updateOption = (qId: string, optId: string, text: string) => {
        const updatedQuestions = module.questions.map(q => {
            if (q.id === qId) {
                const newOptions = q.options.map(o => o.id === optId ? { ...o, text } : o);
                return { ...q, options: newOptions };
            }
            return q;
        });
        onUpdate({ ...module, questions: updatedQuestions });
    };

    const removeQuestion = (qId: string) => {
        onUpdate({ ...module, questions: module.questions.filter(q => q.id !== qId) });
    };
    
    const removeOption = (qId: string, optId: string) => {
         const updatedQuestions = module.questions.map(q => {
            if (q.id === qId) {
                if(q.options.length <= 2) return q; // Prevent removing if only 2 options
                return { ...q, options: q.options.filter(o => o.id !== optId) };
            }
            return q;
        });
        onUpdate({ ...module, questions: updatedQuestions });
    }

    return (
        <div className="space-y-6 pb-10">
            <div>
                <label className="block text-sm font-bold text-brand-orange mb-1 uppercase tracking-wide">Título do Módulo</label>
                <input type="text" value={module.title} onChange={(e) => onUpdate({ ...module, title: e.target.value })} className="w-full bg-brand-blue-dark border border-white/20 rounded-lg p-3 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-brand-orange transition-all" />
            </div>

            <div className="space-y-4">
                {module.questions.map((q, index) => (
                    <div key={q.id} className="bg-brand-blue-dark p-6 rounded-xl border border-white/10 relative group">
                        <button onClick={() => removeQuestion(q.id)} className="absolute top-4 right-4 text-gray-500 hover:text-red-400 transition-colors"><TrashIcon /></button>
                        
                        <div className="mb-4">
                             <label className="block text-xs text-gray-400 mb-1 font-bold uppercase">Pergunta {index + 1}</label>
                             <input 
                                type="text" 
                                value={q.question} 
                                onChange={(e) => updateQuestion(q.id, 'question', e.target.value)} 
                                className="w-full bg-brand-blue border border-white/20 rounded p-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-orange"
                             />
                        </div>

                        <div className="space-y-2 mb-4 pl-4 border-l-2 border-white/10">
                            {q.options.map((opt) => (
                                <div key={opt.id} className="flex items-center gap-2">
                                    <input 
                                        type="radio" 
                                        name={`correct-${q.id}`} 
                                        checked={q.correctOptionId === opt.id} 
                                        onChange={() => updateQuestion(q.id, 'correctOptionId', opt.id)}
                                        className="text-brand-orange bg-brand-blue border-gray-500 focus:ring-brand-orange"
                                    />
                                    <input 
                                        type="text" 
                                        value={opt.text} 
                                        onChange={(e) => updateOption(q.id, opt.id, e.target.value)} 
                                        className={`flex-grow bg-transparent border-b ${q.correctOptionId === opt.id ? 'border-brand-orange text-brand-orange font-bold' : 'border-white/20 text-gray-300'} focus:border-brand-orange focus:outline-none px-2 py-1 transition-colors`}
                                    />
                                    <button onClick={() => removeOption(q.id, opt.id)} className="text-gray-600 hover:text-red-400"><TrashIcon /></button>
                                </div>
                            ))}
                            <button onClick={() => addOption(q.id)} className="text-xs text-brand-orange hover:underline font-bold mt-2">+ Adicionar Opção</button>
                        </div>

                        <div>
                             <label className="block text-xs text-gray-400 mb-1">Explicação (Opcional)</label>
                             <textarea 
                                value={q.explanation} 
                                onChange={(e) => updateQuestion(q.id, 'explanation', e.target.value)} 
                                className="w-full bg-brand-blue/50 border border-white/20 rounded p-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-orange h-20"
                                placeholder="Explique por que a resposta está correta..."
                             />
                        </div>
                    </div>
                ))}
            </div>

            <button onClick={addQuestion} className="w-full py-3 border-2 border-dashed border-white/20 rounded-lg text-gray-400 hover:text-white hover:border-brand-orange hover:bg-brand-orange/10 transition-all font-bold">
                + Adicionar Pergunta
            </button>
        </div>
    );
};

const CardsModuleEditor: React.FC<{ module: CardsModule, onUpdate: (module: CardsModule) => void }> = ({ module, onUpdate }) => {
    const addCard = () => {
        const newCard = { id: `c_${Date.now()}`, front: '', back: '' };
        onUpdate({ ...module, cards: [...module.cards, newCard] });
    };

    const updateCard = (id: string, field: 'front' | 'back', value: string) => {
        const updatedCards = module.cards.map(c => c.id === id ? { ...c, [field]: value } : c);
        onUpdate({ ...module, cards: updatedCards });
    };

    const removeCard = (id: string) => {
        onUpdate({ ...module, cards: module.cards.filter(c => c.id !== id) });
    };

    return (
        <div className="space-y-6 pb-10">
            <div>
                <label className="block text-sm font-bold text-brand-orange mb-1 uppercase tracking-wide">Título do Módulo</label>
                <input type="text" value={module.title} onChange={(e) => onUpdate({ ...module, title: e.target.value })} className="w-full bg-brand-blue-dark border border-white/20 rounded-lg p-3 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-brand-orange transition-all" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {module.cards.map((card, index) => (
                    <div key={card.id} className="bg-brand-blue-dark p-4 rounded-xl border border-white/10 relative">
                        <button onClick={() => removeCard(card.id)} className="absolute top-2 right-2 text-gray-500 hover:text-red-400"><TrashIcon /></button>
                        <span className="text-xs font-bold text-gray-500 mb-2 block">Card {index + 1}</span>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-brand-blue-light mb-1 uppercase font-bold">Frente</label>
                                <textarea 
                                    value={card.front} 
                                    onChange={(e) => updateCard(card.id, 'front', e.target.value)}
                                    className="w-full bg-brand-blue border border-white/20 rounded p-2 text-white focus:outline-none focus:ring-1 focus:ring-brand-orange h-20 resize-none"
                                    placeholder="Texto ou termo..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-brand-orange mb-1 uppercase font-bold">Verso</label>
                                <textarea 
                                    value={card.back} 
                                    onChange={(e) => updateCard(card.id, 'back', e.target.value)}
                                    className="w-full bg-brand-blue border border-white/20 rounded p-2 text-white focus:outline-none focus:ring-1 focus:ring-brand-orange h-24 resize-none"
                                    placeholder="Definição ou explicação..."
                                />
                            </div>
                        </div>
                    </div>
                ))}
                 <button onClick={addCard} className="h-full min-h-[200px] border-2 border-dashed border-white/20 rounded-xl text-gray-400 hover:text-white hover:border-brand-orange hover:bg-brand-orange/10 transition-all font-bold flex flex-col items-center justify-center">
                    <PlusIcon />
                    <span className="mt-2">Adicionar Card</span>
                </button>
            </div>
        </div>
    );
};

export const EditorPage: React.FC<EditorPageProps> = ({ course, setCourse, onOpenExportSelectionModal }) => {
    const [activeView, setActiveView] = useState<EditorView>('modules');
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

    const updateModule = (updatedModule: Module) => {
        setCourse(prev => {
            if (!prev) return null;
            return {
                ...prev,
                modules: prev.modules.map(m => m.id === updatedModule.id ? updatedModule : m)
            };
        });
    };

    const renderContent = () => {
        if (activeView === 'mascot') {
            return <MascotEditor course={course} setCourse={setCourse} />;
        }

        if (activeView === 'modules' && selectedModuleId) {
            const module = course.modules.find(m => m.id === selectedModuleId);
            if (!module) return <div className="flex items-center justify-center h-full text-gray-400">Módulo não encontrado.</div>;

            switch (module.type) {
                case 'text':
                    return <TextModuleEditor module={module as TextModule} onUpdate={updateModule} />;
                case 'video':
                    return <VideoModuleEditor module={module as VideoModule} onUpdate={updateModule} />;
                case 'quiz':
                    return <QuizModuleEditor module={module as QuizModule} onUpdate={updateModule} />;
                case 'cards':
                    return <CardsModuleEditor module={module as CardsModule} onUpdate={updateModule} />;
                default:
                    return <div>Tipo de módulo não suportado.</div>;
            }
        }

        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
                <span className="text-6xl mb-4">👈</span>
                <p className="text-xl">Selecione um módulo ou adicione um novo para começar.</p>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-brand-blue overflow-hidden">
            <Sidebar 
                course={course} 
                setCourse={setCourse}
                selectedModuleId={selectedModuleId} 
                setSelectedModuleId={setSelectedModuleId}
                setActiveView={setActiveView}
                activeView={activeView}
            />
            
            <main className="flex-grow flex flex-col h-full overflow-hidden relative">
                <header className="h-16 bg-white/5 border-b border-white/10 flex items-center justify-between px-6 flex-shrink-0">
                    <div>
                         <input 
                            type="text" 
                            value={course.settings.courseName} 
                            onChange={(e) => setCourse({...course, settings: {...course.settings, courseName: e.target.value}})}
                            className="bg-transparent text-white font-bold text-lg focus:outline-none focus:ring-1 focus:ring-brand-orange rounded px-2"
                         />
                         <p className="text-xs text-gray-400 px-2">Editando curso</p>
                    </div>
                    <button 
                        onClick={onOpenExportSelectionModal}
                        className="bg-brand-orange hover:bg-brand-orange/90 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Exportar Pacote
                    </button>
                </header>
                
                <div className="flex-grow overflow-y-auto p-8">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};