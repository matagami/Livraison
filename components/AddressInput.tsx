import React from 'react';
import type { Address } from '../types';
import { LocationMarkerIcon } from './Icons';

interface AddressInputProps {
  id: keyof { pickupAddress: any; deliveryAddress: any };
  title: string;
  address: Address;
  onAddressChange: (id: string, field: keyof Address, value: string) => void;
  onUseGeolocation?: () => void;
  isGeolocationLoading?: boolean;
}

const AddressInput: React.FC<AddressInputProps> = ({
  id,
  title,
  address,
  onAddressChange,
  onUseGeolocation,
  isGeolocationLoading = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onAddressChange(id, e.target.name as keyof Address, e.target.value);
  };

  return (
    <fieldset className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <legend className="text-xl font-semibold text-gray-800 dark:text-gray-200 col-span-full mb-2">{title}</legend>
      
      <div className="col-span-full">
        <label htmlFor={`${id}-street`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Adresse (rue)</label>
        <input
          type="text"
          name="street"
          id={`${id}-street`}
          value={address.street}
          onChange={handleChange}
          className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="123 Rue de l'Industrie"
        />
      </div>

      <div>
        <label htmlFor={`${id}-city`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ville</label>
        <input
          type="text"
          name="city"
          id={`${id}-city`}
          value={address.city}
          onChange={handleChange}
          className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Métropole"
        />
      </div>

      <div>
        <label htmlFor={`${id}-postalCode`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Code Postal</label>
        <input
          type="text"
          name="postalCode"
          id={`${id}-postalCode`}
          value={address.postalCode}
          onChange={handleChange}
          className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="75001"
        />
      </div>

      {onUseGeolocation && (
         <div className="md:col-span-2">
          <button
            type="button"
            onClick={onUseGeolocation}
            disabled={isGeolocationLoading}
            className="w-full inline-flex justify-center items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            <LocationMarkerIcon />
            {isGeolocationLoading ? 'Obtention de l\'emplacement...' : 'Utiliser ma Position Actuelle pour le Ramassage'}
          </button>
        </div>
      )}
    </fieldset>
  );
};

export default AddressInput;