import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguageStore } from '../store/useLanguageStore';
import { translations } from '../constants/translations';

const NotFound: React.FC = () => {
  const { language } = useLanguageStore();
  const t = (key: keyof typeof translations.vi) => translations[language][key];

  return (
    <div className="container-narrow">
      <div className="card p-4 text-center my-8">
        <h1 className="text-2xl font-bold mb-4">{t('pageNotFound')}</h1>
        <p className="mb-6">
          {t('pageNotFoundDesc')}
        </p>
        <div className="flex justify-center">
          <Link to="/" className="btn btn-primary">
            {t('backToHome')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound; 