
import React, { useState, useCallback, useRef } from 'react';
import { Course, CourseSettings } from './types';
import { db, zipManager } from './lib';
import { EditorPage } from './EditorPage';
import { StudentPage } from './StudentPage';
import { PlusIcon, FolderOpenIcon, BookOpenIcon } from './components/Icons';
import { ExportSelectionModal } from './ExportSelectionModal';

const createNewCourse = (): Course => {
    const defaultSettings: CourseSettings = {
        courseName: "Novo Curso Sem Título",
        mascotName: "Mascote",
        school: "",
        authors: "",
        date: new Date().toISOString().split('T')[0],
        description: "",
        theme: { primaryColor: "#F58248", font: "Poppins" },
        language: "pt-BR",
        mascotEnabled: false,
        showScore: true,
    };

    return {
        id: `course_${Date.now()}`,
        settings: defaultSettings,
        modules: [],
        media: [],
        mascot: [],
    };
};

const HomePage: React.FC<{ 
    onCourseLoad: (course: Course) => void,
    onStudentDemo: () => void,
    isLoading: boolean
}> = ({ onCourseLoad, onStudentDemo, isLoading }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleNewCourse = () => {
        const newCourse = createNewCourse();
        onCourseLoad(newCourse);
    };

    const handleOpenProject = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const course = await zipManager.unzipCourse(file);
                onCourseLoad(course);
            } catch (error) {
                console.error("Failed to open project:", error);
                alert("Erro ao abrir o projeto. Verifique o arquivo .zip.");
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-brand-blue font-sans relative overflow-hidden">
             {/* Decorative Circles */}
             <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full bg-white/5 z-0 pointer-events-none"></div>
             <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full bg-brand-orange/20 z-0 pointer-events-none"></div>

            <div className="text-center z-10 p-4 relative">
                <div className="inline-block bg-brand-orange rounded-2xl px-6 py-3 md:px-8 md:py-4 mb-6 shadow-lg rotate-1 hover:rotate-0 transition-transform">
                    <h1 className="text-3xl md:text-5xl font-extrabold text-white">
                        CourseMakers de Alcântara
                    </h1>
                </div>

                <p className="mt-4 text-lg md:text-xl text-indigo-100 max-w-2xl mx-auto leading-relaxed">
                    Crie cursos incríveis, de forma colaborativa e offline, explorando como a ciência pode ser divertida.
                </p>
            </div>

            <div className="mt-12 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6 z-10">
                <button
                    onClick={handleNewCourse}
                    className="flex items-center justify-center px-8 py-4 bg-white text-brand-blue-dark font-bold rounded-xl shadow-xl hover:bg-gray-100 transition transform hover:-translate-y-1 hover:shadow-2xl"
                >
                    <PlusIcon />
                    <span className="ml-3">Novo Curso</span>
                </button>
                <button
                    onClick={handleOpenProject}
                    className="flex items-center justify-center px-8 py-4 bg-brand-blue-dark/50 border border-white/20 text-white font-bold rounded-xl shadow-xl hover:bg-brand-blue-dark/70 transition transform hover:-translate-y-1 hover:shadow-2xl"
                >
                    <FolderOpenIcon />
                    <span className="ml-3">Abrir Projeto</span>
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".zip"
                    onChange={handleFileChange}
                />
            </div>

             <div className="mt-12 z-10 border-t border-white/10 pt-8 w-full max-w-lg mx-auto">
                 <p className="text-center text-blue-200 text-sm mb-4 uppercase tracking-widest font-semibold">Área do Aluno</p>
                <button
                    onClick={onStudentDemo}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-xl hover:shadow-green-500/30 transition transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <BookOpenIcon />
                            <span className="ml-3">Acessar Plataforma do Aluno (Demo)</span>
                        </>
                    )}
                </button>
             </div>
        </div>
    );
};


function App() {
    const [course, setCourse] = useState<Course | null>(null);
    const [view, setView] = useState<'home' | 'editor' | 'student'>('home');
    const [isLoadingDemo, setIsLoadingDemo] = useState(false);
    const debounceTimeoutRef = useRef<number | null>(null);

    const [isExportSelectionModalOpen, setIsExportSelectionModalOpen] = useState(false);
    const [selectedModuleIdsForExport, setSelectedModuleIdsForExport] = useState<Set<string>>(new Set());

    const debouncedSave = useCallback((courseToSave: Course) => {
         if(debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = window.setTimeout(() => {
            db.saveCourse(courseToSave).catch(err => console.error("Failed to save course to DB", err));
        }, 1000); // Debounce save by 1 second
    }, []);

    const handleSetCourse = (newCourseState: React.SetStateAction<Course | null>) => {
        const resolvedCourse = typeof newCourseState === 'function' ? newCourseState(course) : newCourseState;
        setCourse(resolvedCourse);
        if (resolvedCourse) {
            debouncedSave(resolvedCourse);
        }
    };
    
    const handleCourseLoad = (courseToLoad: Course) => {
        setCourse(courseToLoad);
        if (courseToLoad) {
            debouncedSave(courseToLoad);
        }
        setView('editor');
    };

    const handleLoadStudentDemo = async () => {
        setIsLoadingDemo(true);
        // Utilizando raw.githubusercontent.com para garantir acesso direto e suporte a CORS
        // Link atualizado para o projeto FIRESAT no novo repo CMDA
        const demoUrl = "https://raw.githubusercontent.com/AdsonRS/CMDA/main/FIRESAT__Monitoramento_e_Preven%C3%A7%C3%A3o_de_Inc%C3%AAndios_com_CanSat_em_Alc%C3%A2ntara.zip";
        
        try {
            const response = await fetch(demoUrl);
            if (!response.ok) throw new Error(`Erro ao baixar o curso: ${response.statusText}`);
            const blob = await response.blob();
            const file = new File([blob], "demo.zip", { type: "application/zip" });
            
            const demoCourse = await zipManager.unzipCourse(file);
            setCourse(demoCourse);
            setView('student');
        } catch (e) {
            console.error(e);
            alert(`Erro ao carregar o curso de demonstração: ${(e as Error).message}. Verifique sua conexão.`);
        } finally {
            setIsLoadingDemo(false);
        }
    };

    const openExportSelectionModal = useCallback(() => {
        if (course) {
            // Pre-select all modules by default
            const allModuleIds = new Set(course.modules.map(m => m.id));
            setSelectedModuleIdsForExport(allModuleIds);
            setIsExportSelectionModalOpen(true);
        }
    }, [course]);

    const handleConfirmExport = useCallback(async (selectedIds: string[]) => {
        setIsExportSelectionModalOpen(false);
        if (!course) return;

        try {
            const blob = await zipManager.zipCourse(course, selectedIds);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${course.settings.courseName.replace(/\s/g, '_') || 'curso'}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export course:", error);
            alert("Erro ao exportar o curso.");
        }
    }, [course]);

    const renderView = () => {
        switch(view) {
            case 'home':
                return (
                    <HomePage 
                        onCourseLoad={handleCourseLoad} 
                        onStudentDemo={handleLoadStudentDemo}
                        isLoading={isLoadingDemo}
                    />
                );
            case 'editor':
                if (course) {
                    return <EditorPage course={course} setCourse={handleSetCourse} onOpenExportSelectionModal={openExportSelectionModal}/>;
                }
                setView('home');
                return null;
            case 'student':
                 if (course) {
                    return <StudentPage course={course} onExit={() => setView('home')} />;
                 }
                 setView('home');
                 return null;
            default:
                 return <HomePage onCourseLoad={handleCourseLoad} onStudentDemo={handleLoadStudentDemo} isLoading={isLoadingDemo}/>;
        }
    };

    return (
        <>
            {renderView()}
            {isExportSelectionModalOpen && course && (
                <ExportSelectionModal
                    isOpen={isExportSelectionModalOpen}
                    onClose={() => setIsExportSelectionModalOpen(false)}
                    courseModules={course.modules}
                    onConfirmExport={handleConfirmExport}
                    initialSelectedIds={selectedModuleIdsForExport}
                />
            )}
        </>
    );
}

export default App;
