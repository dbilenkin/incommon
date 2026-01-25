import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSelector = ({ className = '' }) => {
  const { i18n } = useTranslation();

  const handleChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <select
      value={i18n.language?.substring(0, 2) || 'en'}
      onChange={handleChange}
      className={`bg-gray-700 text-gray-200 text-sm px-2 py-1 rounded border border-gray-600 focus:outline-none cursor-pointer ${className}`}
    >
      <option value="en">EN</option>
      <option value="ru">RU</option>
    </select>
  );
};

export default LanguageSelector;
