import React from 'react';
import { ErrorIcon, WarningIcon, InfoIcon, CloseIcon } from './Icons';

type AlertType = 'error' | 'warning' | 'info';

interface AlertProps {
  type: AlertType;
  title: string;
  message: string;
  onClose: () => void;
}

const alertConfig = {
  error: {
    Icon: ErrorIcon,
    baseClasses: 'bg-red-50 dark:bg-red-900/40 border-red-400 dark:border-red-600',
    iconClasses: 'text-red-500 dark:text-red-400',
    titleClasses: 'text-red-800 dark:text-red-100',
    messageClasses: 'text-red-700 dark:text-red-200',
  },
  warning: {
    Icon: WarningIcon,
    baseClasses: 'bg-yellow-50 dark:bg-yellow-900/40 border-yellow-400 dark:border-yellow-600',
    iconClasses: 'text-yellow-500 dark:text-yellow-400',
    titleClasses: 'text-yellow-800 dark:text-yellow-100',
    messageClasses: 'text-yellow-700 dark:text-yellow-200',
  },
  info: {
    Icon: InfoIcon,
    baseClasses: 'bg-blue-50 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600',
    iconClasses: 'text-blue-500 dark:text-blue-400',
    titleClasses: 'text-blue-800 dark:text-blue-100',
    messageClasses: 'text-blue-700 dark:text-blue-200',
  },
};

const Alert: React.FC<AlertProps> = ({ type, title, message, onClose }) => {
  const { Icon, baseClasses, iconClasses, titleClasses, messageClasses } = alertConfig[type];

  return (
    <div className={`mt-6 p-4 rounded-lg border-l-4 flex ${baseClasses}`} role="alert">
      <div className={`flex-shrink-0 ${iconClasses}`}>
        <Icon />
      </div>
      <div className="ml-3">
        <h3 className={`text-sm font-bold ${titleClasses}`}>{title}</h3>
        <p className={`mt-1 text-sm ${messageClasses}`}>{message}</p>
      </div>
      <div className="ml-auto pl-3">
        <div className="-mx-1.5 -my-1.5">
          <button
            type="button"
            className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${iconClasses} ${baseClasses.split(' ')[0]} ${baseClasses.split(' ')[1]}`}
            onClick={onClose}
            aria-label="Fermer"
          >
            <CloseIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Alert;
