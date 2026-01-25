import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';

const Nav = ({ className, word, round, name, gameCode  }) => {
  const { t } = useTranslation('common');

  return (
    <nav className="bg-gray-800 text-gray-300 border-b border-gray-500">
      <div className={`mx-auto px-4 py-3 flex justify-between items-end ${className}`}>
        <div className="flex items-center gap-3">
          <Link to={`/`}><h1 className="text-xl font-bold">Incommon</h1></Link>
          <LanguageSelector />
        </div>
        {gameCode && <div>
          <p className="text-xl">{gameCode}</p>
        </div>}
        {word && <div>
          <p className="text-xl">{word}</p>
        </div>}
        {round && <div>
          <p className="text-xl">{t('nav.round', { round })}</p>
        </div>}
        {name && <div>
          <p className="text-xl">{name}</p>
        </div>}
      </div>
    </nav>
  );
};

export default Nav;
