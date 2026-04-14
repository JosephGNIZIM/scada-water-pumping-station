import React from 'react';
import { useTutorial } from '../tutorial/TutorialContext';

const quickStartSteps = [
    {
        title: 'Etape 1 : Connexion et authentification',
        text: 'Connectez-vous avec un compte autorise puis verifiez votre role dans les parametres ou le bandeau de session.',
        icon: '01',
    },
    {
        title: 'Etape 2 : Lecture du tableau de bord',
        text: 'Surveillez le score de sante, les jauges et les tendances pour detecter rapidement une anomalie.',
        icon: '02',
    },
    {
        title: 'Etape 3 : Comprendre le synoptique',
        text: 'Reperez les deux bacs, les deux pompes et les vannes pour suivre le flux de l eau dans l installation.',
        icon: '03',
    },
    {
        title: 'Etape 4 : Gerer les alarmes',
        text: 'Filtrez les alarmes par priorite puis acquittez uniquement les evenements analyses et traites.',
        icon: '04',
    },
    {
        title: 'Etape 5 : Exporter les donnees',
        text: 'Depuis l historique, choisissez une plage de dates et exportez le rapport en CSV ou en PDF.',
        icon: '05',
    },
];

const faqItems = [
    {
        question: 'Comment savoir si le systeme est en mode nominal ?',
        answer: 'Le score de sante doit rester eleve, le badge LIVE doit etre present et le footer doit indiquer un etat nominal sans alarme active.',
    },
    {
        question: 'Quand faut-il acquitter une alarme ?',
        answer: 'Uniquement apres verification de la cause, application de l action corrective et confirmation du retour a un etat stable.',
    },
    {
        question: 'A quoi sert le synoptique ?',
        answer: 'Il donne une lecture rapide du processus hydraulique et permet des commandes directes sur certains equipements.',
    },
    {
        question: 'Comment exporter un rapport d exploitation ?',
        answer: 'Ouvrez la page Historique, choisissez la plage de dates, puis utilisez les boutons Export CSV ou Export PDF.',
    },
];

const TutorialPage: React.FC = () => {
    const { startTutorial } = useTutorial();
    const [openIndex, setOpenIndex] = React.useState<number | null>(0);

    return (
        <div className="dashboard-shell">
            <section className="hero-card">
                <div>
                    <p className="eyebrow">Tutoriel</p>
                    <h1>Guide d utilisation de la station SCADA</h1>
                    <p className="hero-copy">
                        Cette page aide les nouveaux utilisateurs a comprendre rapidement le tableau de bord, le synoptique, les alarmes et les rapports.
                    </p>
                </div>
                <div className="action-row">
                    <button className="btn btn-primary" onClick={startTutorial}>Lancer le tour guide</button>
                </div>
            </section>

            <section className="summary-grid">
                {quickStartSteps.map((step) => (
                    <article key={step.title} className="summary-card glow-ok tutorial-step-card">
                        <div className="tutorial-step-index">{step.icon}</div>
                        <h3>{step.title}</h3>
                        <p>{step.text}</p>
                    </article>
                ))}
            </section>

            <section className="dashboard-grid dashboard-grid--wide">
                <section className="panel glow-ok">
                    <div className="panel-heading">
                        <div>
                            <p className="eyebrow">Roles</p>
                            <h2>Roles utilisateurs</h2>
                        </div>
                    </div>
                    <div className="role-table-wrap">
                        <table className="role-table">
                            <thead>
                                <tr>
                                    <th>Fonction</th>
                                    <th>Admin</th>
                                    <th>Operateur</th>
                                    <th>Visiteur</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Voir le tableau de bord</td>
                                    <td>Oui</td>
                                    <td>Oui</td>
                                    <td>Oui</td>
                                </tr>
                                <tr>
                                    <td>Commander pompes et vannes</td>
                                    <td>Oui</td>
                                    <td>Oui</td>
                                    <td>Non</td>
                                </tr>
                                <tr>
                                    <td>Acquitter les alarmes</td>
                                    <td>Oui</td>
                                    <td>Oui</td>
                                    <td>Non</td>
                                </tr>
                                <tr>
                                    <td>Modifier les seuils</td>
                                    <td>Oui</td>
                                    <td>Non</td>
                                    <td>Non</td>
                                </tr>
                                <tr>
                                    <td>Exporter les rapports</td>
                                    <td>Oui</td>
                                    <td>Oui</td>
                                    <td>Oui</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="panel glow-warning">
                    <div className="panel-heading">
                        <div>
                            <p className="eyebrow">Demo</p>
                            <h2>Simulation d une journee d exploitation</h2>
                        </div>
                    </div>
                    <div className="tutorial-demo">
                        <div className="demo-sun" />
                        <div className="demo-wave demo-wave--one" />
                        <div className="demo-wave demo-wave--two" />
                        <div className="demo-timeline">
                            <span>06:00 Mise en route</span>
                            <span>11:30 Stabilisation du debit</span>
                            <span>16:10 Alerte pression puis acquittement</span>
                            <span>20:00 Export du rapport quotidien</span>
                        </div>
                    </div>
                </section>
            </section>

            <section className="panel glow-ok">
                <div className="panel-heading">
                    <div>
                        <p className="eyebrow">FAQ</p>
                        <h2>Questions frequentes</h2>
                    </div>
                </div>
                <div className="faq-list">
                    {faqItems.map((item, index) => {
                        const open = openIndex === index;
                        return (
                            <article key={item.question} className={`faq-item ${open ? 'open' : ''}`}>
                                <button className="faq-trigger" onClick={() => setOpenIndex(open ? null : index)}>
                                    <span>{item.question}</span>
                                    <span>{open ? '-' : '+'}</span>
                                </button>
                                {open && <p className="muted">{item.answer}</p>}
                            </article>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};

export default TutorialPage;
