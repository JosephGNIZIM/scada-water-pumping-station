import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';

const UnauthorizedPage: React.FC = () => {
    const { tr } = useI18n();

    return (
        <div className="page-state page-state--card">
            <p className="eyebrow">{tr('Acces refuse', 'Access denied')}</p>
            <h1>{tr('Action reservee a un niveau d autorisation superieur', 'Action reserved for a higher authorization level')}</h1>
            <p className="hero-copy">{tr('Votre role actuel ne permet pas d acceder a cette page ou a cette fonction.', 'Your current role does not allow access to this page or function.')}</p>
            <Link className="btn btn-primary" to="/">{tr('Retour au tableau de bord', 'Back to dashboard')}</Link>
        </div>
    );
};

export default UnauthorizedPage;
