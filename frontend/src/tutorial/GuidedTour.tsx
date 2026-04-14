import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTutorial } from './TutorialContext';

const GuidedTour: React.FC = () => {
    const { isOpen, currentStepIndex, steps, nextStep, previousStep, closeTutorial } = useTutorial();
    const navigate = useNavigate();
    const location = useLocation();
    const [rect, setRect] = React.useState<DOMRect | null>(null);

    const step = steps[currentStepIndex];

    React.useEffect(() => {
        if (!isOpen || !step) {
            return;
        }

        if (location.pathname !== step.route) {
            navigate(step.route);
            return;
        }

        const updateTarget = () => {
            const element = document.querySelector(step.selector) as HTMLElement | null;
            if (!element) {
                setRect(null);
                return;
            }

            element.scrollIntoView({ block: 'center', behavior: 'smooth' });
            setRect(element.getBoundingClientRect());
        };

        const timer = window.setTimeout(updateTarget, 250);
        window.addEventListener('resize', updateTarget);
        window.addEventListener('scroll', updateTarget, true);

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('resize', updateTarget);
            window.removeEventListener('scroll', updateTarget, true);
        };
    }, [currentStepIndex, isOpen, location.pathname, navigate, step]);

    if (!isOpen || !step) {
        return null;
    }

    const highlightStyle = rect ? {
        top: `${rect.top - 8}px`,
        left: `${rect.left - 8}px`,
        width: `${rect.width + 16}px`,
        height: `${rect.height + 16}px`,
    } : undefined;

    const cardStyle = rect ? {
        top: `${Math.min(window.innerHeight - 220, rect.bottom + 18)}px`,
        left: `${Math.max(24, Math.min(window.innerWidth - 360, rect.left))}px`,
    } : {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
    };

    return (
        <div className="tutorial-overlay">
            {rect && <div className="tutorial-highlight" style={highlightStyle} />}
            <div className="tutorial-card" style={cardStyle}>
                <p className="eyebrow">Tutoriel interactif</p>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                <div className="tutorial-progress">
                    Etape {currentStepIndex + 1}/{steps.length}
                </div>
                <div className="action-row">
                    <button className="btn btn-secondary" onClick={() => previousStep()} disabled={currentStepIndex === 0}>
                        Precedent
                    </button>
                    <button className="btn btn-primary" onClick={() => nextStep()}>
                        {currentStepIndex === steps.length - 1 ? 'Terminer' : 'Suivant'}
                    </button>
                    <button className="btn btn-ghost" onClick={() => closeTutorial(true)}>
                        Passer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GuidedTour;
