
import React, { useState, useEffect } from 'react';
import { Course, Module, TextModule, VideoModule, QuizModule, CardsModule, MascotPose } from './types';
import { 
    ChevronRightIcon, 
    ChevronLeftIcon, 
    CheckCircleIcon, 
    XCircleIcon, 
    TrophyIcon,
    BookOpenIcon,
    PlayIcon
} from './components/Icons';

// Fallback images if course has no mascot
const FALLBACK_MASCOTS = {
    happy: 'https://i.imgur.com/oaZ8vKr.png',
    explaining: 'https://i.imgur.com/6FPSrbo.png',
    sad: 'https://i.imgur.com/QrjBlYr.png',
    thinking: 'https://i.imgur.com/rsV4LAc.png',
};

interface StudentPageProps {
    course: Course;
    onExit: () => void;
}

const MascotDisplay: React.FC<{ 
    course: Course; 
    pose: 'happy' | 'explaining' | 'sad' | 'thinking';
    className?: string;
}> = ({ course, pose, className = "" }) => {
    // Try to find the custom mascot from the course
    const customMascot = course.mascot.find(m => m.type === pose);
    const imageUrl = customMascot ? customMascot.blobUrl : FALLBACK_MASCOTS[pose];

    return (
        <div className={`transition-all duration-500 ease-in-out ${className}`}>
            <img 
                src={imageUrl} 
                alt={`Mascote ${pose}`} 
                className="max-h-[250px] w-auto drop-shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-700"
            />
        </div>
    );
};

export const StudentPage: React.FC<StudentPageProps> = ({ course, onExit }) => {
    const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
    const [answers, setAnswers] = useState<{ [key: string]: string }>({}); // questionId -> optionId
    const [score, setScore] = useState(0);
    const [showResults, setShowResults] = useState(false);
    
    // Derived state for the current module
    const currentModule = course.modules[currentModuleIndex];
    const isFirst = currentModuleIndex === 0;
    const isLast = currentModuleIndex === course.modules.length - 1;

    // Progress calculation
    const progress = ((currentModuleIndex + 1) / course.modules.length) * 100;

    const handleNext = () => {
        if (isLast) {
            setShowResults(true);
        } else {
            setCurrentModuleIndex(prev => prev + 1);
            window.scrollTo(0, 0);
        }
    };

    const handlePrev = () => {
        if (!isFirst) {
            setCurrentModuleIndex(prev => prev - 1);
            window.scrollTo(0, 0);
        }
    };

    // Calculate score
    useEffect(() => {
        let newScore = 0;
        course.modules.forEach(mod => {
            if (mod.type === 'quiz') {
                const quiz = mod as QuizModule;
                quiz.questions.forEach(q => {
                    if (answers[q.id] === q.correctOptionId) {
                        newScore++;
                    }
                });
            }
        });
        setScore(newScore);
    }, [answers, course.modules]);

    if (showResults) {
        return (
            <div className="min-h-screen bg-brand-blue flex items-center justify-center p-4 overflow-hidden relative">
                {/* Background decorative elements */}
                <div className="absolute top-0 left-0 w-64 h-64 bg-brand-orange/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-blue-light/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

                <div className="bg-white text-brand-blue-dark rounded-3xl shadow-2xl p-8 max-w-2xl w-full text-center relative z-10 animate-in zoom-in-50 duration-500">
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <TrophyIcon />
                            <div className="absolute inset-0 animate-ping opacity-20 bg-yellow-400 rounded-full"></div>
                        </div>
                    </div>
                    
                    <h1 className="text-4xl font-extrabold text-brand-orange mb-4">Parabéns!</h1>
                    <p className="text-xl mb-8">Você completou o curso <span className="font-bold">{course.settings.courseName}</span>.</p>
                    
                    {course.settings.showScore && (
                        <div className="bg-gray-100 rounded-2xl p-6 mb-8 mx-auto max-w-xs">
                             <p className="text-sm uppercase tracking-wide text-gray-500 font-bold mb-1">Sua Pontuação</p>
                             <p className="text-5xl font-extrabold text-brand-blue">{score}</p>
                        </div>
                    )}

                    {/* Adjusted container to remove fixed height and allow natural stacking */}
                    <div className="flex justify-center mb-8">
                         <MascotDisplay course={course} pose="explaining" />
                    </div>

                    <button 
                        onClick={onExit}
                        className="bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform hover:scale-105"
                    >
                        Voltar ao Início
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50 text-gray-800 font-sans">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-6 z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onExit} className="text-gray-400 hover:text-brand-orange transition-colors">
                        <span className="font-bold text-lg">✕</span>
                    </button>
                    <div>
                        <h1 className="font-bold text-brand-blue-dark truncate max-w-xs md:max-w-md">{course.settings.courseName}</h1>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>Módulo {currentModuleIndex + 1} de {course.modules.length}</span>
                        </div>
                    </div>
                </div>
                {course.settings.showScore && (
                    <div className="flex items-center gap-2 bg-brand-orange/10 px-3 py-1 rounded-full">
                        <span className="text-brand-orange font-bold">★ {score} pts</span>
                    </div>
                )}
            </header>

            {/* Progress Bar */}
            <div className="h-1 bg-gray-200 w-full shrink-0">
                <div 
                    className="h-full bg-brand-orange transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            {/* Main Content */}
            <main className="flex-grow overflow-hidden relative flex flex-col md:flex-row">
                {/* Sidebar (Module List - Hidden on mobile usually, but simpler here to keep it hidden or collapsible. For now, simple standard layout) */}
                <aside className="hidden md:block w-64 bg-white border-r border-gray-100 overflow-y-auto shrink-0 z-10">
                    <div className="p-4 space-y-2">
                        {course.modules.map((mod, idx) => (
                            <button 
                                key={mod.id}
                                onClick={() => setCurrentModuleIndex(idx)}
                                className={`w-full text-left p-3 rounded-lg text-sm flex items-center gap-3 transition-colors ${
                                    idx === currentModuleIndex 
                                        ? 'bg-brand-blue/10 text-brand-blue font-bold border-l-4 border-brand-blue' 
                                        : 'text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                <div className={`shrink-0 ${idx === currentModuleIndex ? 'text-brand-blue' : 'text-gray-300'}`}>
                                    {mod.type === 'video' ? <PlayIcon /> : (mod.type === 'quiz' ? '?' : <BookOpenIcon />)}
                                </div>
                                <span className="truncate">{mod.title}</span>
                                {idx < currentModuleIndex && <div className="ml-auto text-green-500"><CheckCircleIcon /></div>}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Content Area */}
                <div className="flex-grow overflow-y-auto bg-gray-50 relative">
                     <div className="max-w-4xl mx-auto p-4 md:p-8 min-h-full flex flex-col">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-10 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 flex-grow">
                             <span className="inline-block px-3 py-1 bg-brand-blue/5 text-brand-blue text-xs font-bold rounded-full mb-4 uppercase tracking-wider">
                                {currentModule.type}
                             </span>
                             <h2 className="text-3xl font-extrabold text-brand-blue-dark mb-6">{currentModule.title}</h2>
                             
                             <div className="content-body">
                                <ModuleRenderer 
                                    module={currentModule} 
                                    course={course}
                                    answers={answers}
                                    setAnswers={setAnswers}
                                />
                             </div>
                        </div>
                     </div>
                </div>
            </main>

            {/* Bottom Navigation */}
            <footer className="bg-white border-t border-gray-200 p-4 shrink-0 flex justify-between items-center z-20">
                <button 
                    onClick={handlePrev}
                    disabled={isFirst}
                    className={`flex items-center px-6 py-3 rounded-xl font-bold transition-all ${
                        isFirst ? 'text-gray-300 cursor-not-allowed' : 'text-brand-blue-dark hover:bg-gray-100'
                    }`}
                >
                    <ChevronLeftIcon />
                    <span className="ml-2 hidden md:inline">Anterior</span>
                </button>

                <button 
                    onClick={handleNext}
                    className="flex items-center bg-brand-blue text-white hover:bg-brand-blue-dark px-8 py-3 rounded-xl font-bold shadow-lg shadow-brand-blue/30 transition-all transform hover:scale-105 active:scale-95"
                >
                    <span className="mr-2">{isLast ? 'Finalizar' : 'Próximo'}</span>
                    <ChevronRightIcon />
                </button>
            </footer>
        </div>
    );
};

const ModuleRenderer: React.FC<{
    module: Module;
    course: Course;
    answers: {[key: string]: string};
    setAnswers: React.Dispatch<React.SetStateAction<{[key: string]: string}>>;
}> = ({ module, course, answers, setAnswers }) => {

    switch (module.type) {
        case 'text':
            const textMod = module as TextModule;
            return (
                <div className="prose prose-lg prose-blue max-w-none text-gray-600">
                    <div dangerouslySetInnerHTML={{ __html: textMod.content }} />
                     {/* Decorative Mascot for Text Modules (Changed to Happy as requested: 'estar alegre na explicação') */}
                    <div className="mt-8 flex justify-end">
                        <MascotDisplay course={course} pose="happy" className="w-32 opacity-80" />
                    </div>
                </div>
            );
        
        case 'video':
            const vidMod = module as VideoModule;
            return (
                <div className="space-y-6">
                    {vidMod.source === 'url' && vidMod.url && (
                        <div className="aspect-video rounded-2xl overflow-hidden shadow-xl bg-black">
                            <iframe 
                                width="100%" 
                                height="100%" 
                                src={vidMod.url.replace('watch?v=', 'embed/')} 
                                title={vidMod.title}
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                            ></iframe>
                        </div>
                    )}
                    <div className="bg-blue-50 p-6 rounded-2xl flex items-start gap-4">
                        <MascotDisplay course={course} pose="thinking" className="w-24 shrink-0" />
                        <div>
                            <h4 className="font-bold text-brand-blue-dark text-lg mb-2">Hora de assistir!</h4>
                            <p className="text-gray-600">Assista ao vídeo acima com atenção para aprender mais sobre o assunto.</p>
                        </div>
                    </div>
                </div>
            );

        case 'cards':
            const cardMod = module as CardsModule;
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {cardMod.cards.map((card) => (
                        <FlipCard key={card.id} card={card} />
                    ))}
                </div>
            );

        case 'quiz':
            const quizMod = module as QuizModule;
            return (
                <div className="space-y-12">
                    {quizMod.questions.map((q, idx) => {
                        const userAnswer = answers[q.id];
                        const isCorrect = userAnswer === q.correctOptionId;
                        const isAnswered = !!userAnswer;

                        return (
                            <div key={q.id} className="relative">
                                <div className="mb-4">
                                    <span className="text-brand-orange font-bold text-sm tracking-wider uppercase mb-1 block">Pergunta {idx + 1}</span>
                                    <h3 className="text-xl font-bold text-gray-800">{q.question}</h3>
                                </div>
                                
                                <div className="space-y-3 relative z-10">
                                    {q.options.map(opt => {
                                        let btnClass = "w-full text-left p-4 rounded-xl border-2 transition-all font-medium relative overflow-hidden ";
                                        
                                        if (isAnswered) {
                                            if (opt.id === q.correctOptionId) {
                                                btnClass += "bg-green-50 border-green-500 text-green-700 shadow-md";
                                            } else if (opt.id === userAnswer) {
                                                btnClass += "bg-red-50 border-red-500 text-red-700 opacity-70";
                                            } else {
                                                btnClass += "bg-gray-50 border-transparent text-gray-400 opacity-50";
                                            }
                                        } else {
                                            btnClass += "bg-white border-gray-200 hover:border-brand-blue hover:bg-brand-blue/5 text-gray-600 hover:text-brand-blue cursor-pointer shadow-sm hover:shadow-md";
                                        }

                                        return (
                                            <button
                                                key={opt.id}
                                                onClick={() => !isAnswered && setAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                                                disabled={isAnswered}
                                                className={btnClass}
                                            >
                                                <div className="flex items-center justify-between relative z-10">
                                                    <span>{opt.text}</span>
                                                    {isAnswered && opt.id === q.correctOptionId && <CheckCircleIcon />}
                                                    {isAnswered && opt.id === userAnswer && userAnswer !== q.correctOptionId && <XCircleIcon />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Feedback Section with Mascot */}
                                {isAnswered && (
                                    <div className={`mt-6 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-500 ${isCorrect ? 'bg-green-100/50' : 'bg-red-100/50'}`}>
                                        <div className="shrink-0">
                                            {/* Changed emotion: Correct -> Explaining (Celebrating), Incorrect -> Sad */}
                                            <MascotDisplay 
                                                course={course} 
                                                pose={isCorrect ? 'explaining' : 'sad'} 
                                                className="w-32 h-32 object-contain"
                                            />
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-lg mb-2 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                                {isCorrect ? 'Muito bem! Acertou!' : 'Ops! Não foi dessa vez.'}
                                            </h4>
                                            {q.explanation && (
                                                <p className="text-gray-700 leading-relaxed bg-white/60 p-4 rounded-xl text-sm">
                                                    <span className="font-bold block mb-1 text-gray-900">Explicação:</span>
                                                    {q.explanation}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            );
            
        default:
            return <div>Módulo não suportado para visualização.</div>;
    }
};

// Re-implemented FlipCard using inline styles for guaranteed 3D transforms
const FlipCard: React.FC<{ card: { front: string; back: string } }> = ({ card }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <div 
            className="h-64 cursor-pointer group"
            style={{ perspective: '1000px' }}
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <div 
                className="relative w-full h-full transition-transform duration-700"
                style={{ 
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
            >
                {/* Front */}
                <div 
                    className="absolute inset-0 bg-white border-2 border-brand-blue/20 rounded-2xl p-6 flex items-center justify-center text-center shadow-lg group-hover:shadow-xl group-hover:border-brand-blue/40 transition-all"
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    <div>
                        <span className="text-xs font-bold text-brand-orange uppercase tracking-widest mb-2 block">Cartão</span>
                        <p className="text-xl font-bold text-brand-blue-dark">{card.front}</p>
                        <p className="text-sm text-gray-400 mt-4 font-medium">(Clique para virar)</p>
                    </div>
                </div>
                
                {/* Back */}
                <div 
                    className="absolute inset-0 bg-brand-blue text-white rounded-2xl p-6 flex items-center justify-center text-center shadow-xl"
                    style={{ 
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)'
                    }}
                >
                    <div>
                        <p className="text-lg leading-relaxed font-medium">{card.back}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
