import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export interface TutorialStep {
    route: string;
    selector: string;
    title: string;
    description: string;
}

interface TutorialContextValue {
    isOpen: boolean;
    currentStepIndex: number;
    steps: TutorialStep[];
    startTutorial: () => void;
    closeTutorial: (completed?: boolean) => void;
    nextStep: () => void;
    previousStep: () => void;
}

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

const STORAGE_KEY = 'scada-tutorial-completed';

const tutorialSteps: TutorialStep[] = [
    {
        route: '/',
        selector: '[data-tutorial="nav-home"]',
        title: 'Navigation principale',
        description: 'Commencez ici pour retrouver les pages essentielles de la station depuis la barre de navigation.',
    },
    {
        route: '/dashboard',
        selector: '[data-tutorial="system-health"]',
        title: 'Sante globale du systeme',
        description: 'Ce bloc synthese donne un score global et indique le nombre d alarmes actives.',
    },
    {
        route: '/dashboard',
        selector: '[data-tutorial="synoptic-preview"]',
        title: 'Apercu du synoptique',
        description: 'Le synoptique anime vous permet de visualiser les cuves, pompes, vannes et flux d eau.',
    },
    {
        route: '/pump-status',
        selector: '[data-tutorial="pump-control"]',
        title: 'Commande des pompes',
        description: 'Depuis ce panneau vous pouvez lancer ou arreter la pompe principale avec retour d etat persistant.',
    },
    {
        route: '/sensor-readings',
        selector: '[data-tutorial="sensor-panel"]',
        title: 'Lecture des capteurs',
        description: 'Consultez les valeurs instantanees et leurs mini tendances directement depuis cette vue.',
    },
    {
        route: '/alarms',
        selector: '[data-tutorial="alarm-center"]',
        title: 'Gestion des alarmes',
        description: 'Filtrez les alarmes, consultez leur priorite et acquittez les evenements traites.',
    },
    {
        route: '/history',
        selector: '[data-tutorial="history-exports"]',
        title: 'Historique et exports',
        description: 'Choisissez une plage de dates puis exportez les donnees en CSV ou PDF.',
    },
    {
        route: '/settings',
        selector: '[data-tutorial="tutorial-relaunch"]',
        title: 'Relancer le tutoriel',
        description: 'Vous pouvez relancer ce tour guide a tout moment depuis les parametres de l application.',
    },
];

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const completed = window.localStorage.getItem(STORAGE_KEY);
        if (!completed) {
            setIsOpen(true);
        }
    }, []);

    const value = useMemo<TutorialContextValue>(() => ({
        isOpen,
        currentStepIndex,
        steps: tutorialSteps,
        startTutorial: () => {
            setCurrentStepIndex(0);
            setIsOpen(true);
            window.localStorage.removeItem(STORAGE_KEY);
        },
        closeTutorial: (completed = true) => {
            setIsOpen(false);
            if (completed) {
                window.localStorage.setItem(STORAGE_KEY, 'true');
            }
        },
        nextStep: () => {
            setCurrentStepIndex((current) => {
                if (current >= tutorialSteps.length - 1) {
                    window.localStorage.setItem(STORAGE_KEY, 'true');
                    setIsOpen(false);
                    return current;
                }
                return current + 1;
            });
        },
        previousStep: () => {
            setCurrentStepIndex((current) => Math.max(0, current - 1));
        },
    }), [currentStepIndex, isOpen]);

    return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
};

export const useTutorial = (): TutorialContextValue => {
    const context = useContext(TutorialContext);

    if (!context) {
        throw new Error('useTutorial must be used within TutorialProvider');
    }

    return context;
};
