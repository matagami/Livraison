import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { OrderDetails, Address } from './types';
import { Stage, ParcelCategory } from './types';
import AddressInput from './components/AddressInput';
import Alert from './components/Alert';
import Calendar from './components/Calendar';
import { TruckIcon, PackageIcon, UserIcon, CalendarIcon } from './components/Icons';
import { generateConfirmationMessage, sendSmsNotification, sendEmailNotification } from './services/geminiService';

const initialOrderDetails: OrderDetails = {
  pickupAddress: { street: '', city: '', postalCode: '' },
  deliveryAddress: { street: '', city: '', postalCode: '' },
  pickupDateTime: '',
  parcel: { weight: '', length: '', width: '', height: '', contents: '', category: ParcelCategory.GENERAL, specialInstructions: '' },
  customer: { name: '', phone: '', email: '' },
};

const App: React.FC = () => {
  const [orderDetails, setOrderDetails] = useState<OrderDetails>(initialOrderDetails);
  const [stage, setStage] = useState<Stage>(Stage.FORM);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; time: number; cost: number } | null>(null);
  const [isGeolocationLoading, setIsGeolocationLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [formInfo, setFormInfo] = useState<string | null>(null);
  
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pickupDate && pickupTime) {
      setOrderDetails(prev => ({ ...prev, pickupDateTime: `${pickupDate}T${pickupTime}`}));
    }
  }, [pickupDate, pickupTime]);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [calendarRef]);

  const timeSlots = useMemo(() => {
    const slots = [];
    // Boucle de 8h00 (480 minutes) à 17h30 (1050 minutes) par incréments de 30 minutes.
    for (let totalMinutes = 480; totalMinutes <= 1050; totalMinutes += 30) {
        const hour = Math.floor(totalMinutes / 60);
        const minute = totalMinutes % 60;
        
        // La valeur interne reste au format 24h pour la cohérence des données.
        const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        
        let displayHour = hour % 12;
        if (displayHour === 0) displayHour = 12; // 12h est 12 PM, 0h est 12 AM
        
        const period = hour >= 12 ? 'PM' : 'AM';
        
        // L'étiquette est au format 12h convivial.
        const label = `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
        
        slots.push({ value, label });
    }
    return slots;
  }, []);

  const handleInputChange = useCallback((section: keyof OrderDetails, field: string, value: string | boolean) => {
    setOrderDetails(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as object),
        [field]: value,
      },
    }));
  }, []);

  const handleAddressChange = useCallback((id: string, field: keyof Address, value: string) => {
    handleInputChange(id as keyof OrderDetails, field, value);
  }, [handleInputChange]);

  const handleSimpleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, dataset } = target;
    if (dataset.section) {
        const finalValue = target.type === 'checkbox' ? target.checked : value;
        handleInputChange(dataset.section as keyof OrderDetails, name, finalValue);
    }
  }, [handleInputChange]);
  
  const handleUseGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setFormError("La géolocalisation n'est pas prise en charge par votre navigateur ou la connexion n'est pas sécurisée (HTTPS requis).");
      return;
    }

    setIsGeolocationLoading(true);
    setFormError(null);
    setFormInfo(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // SIMULATION : Dans une application réelle, ces coordonnées seraient envoyées à une API
        // de géocodage inversé pour obtenir une adresse postale précise.
        // Pour cette démo, nous utilisons une adresse simulée.
        console.log(`Géolocalisation réussie :`, position.coords);
        setOrderDetails(prev => ({
          ...prev,
          pickupAddress: {
            street: '123 Rue de la Géolocalisation',
            city: 'Votre Ville (Simulée)',
            postalCode: `${Math.floor(Math.random() * 89999) + 10000}`,
          },
        }));
        setFormInfo("Adresse simulée avec succès. Une application réelle utiliserait votre adresse exacte via un service de géocodage inversé.");
        setIsGeolocationLoading(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        let message = "Une erreur est survenue lors de l'obtention de la localisation. Veuillez saisir l'adresse manuellement.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "La permission d'accès à la géolocalisation a été refusée. Veuillez l'activer ou saisir l'adresse manuellement.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Les informations de localisation ne sont pas disponibles actuellement. Veuillez réessayer ou saisir l'adresse manuellement.";
            break;
          case error.TIMEOUT:
            message = "La demande de géolocalisation a expiré. Veuillez réessayer.";
            break;
        }
        setFormError(message);
        setIsGeolocationLoading(false);
      },
      { enableHighAccuracy: true }
    );
  }, []);

  const isAddressComplete = (address: Address) => {
    return address.street && address.city && address.postalCode;
  };

  useEffect(() => {
    if (isAddressComplete(orderDetails.pickupAddress) && isAddressComplete(orderDetails.deliveryAddress) && orderDetails.parcel.weight) {
      const distance = Math.floor(Math.random() * 200) + 10;
      const time = Math.round(distance * 1.2);
      const cost = 50 + distance * 1.5 + parseFloat(orderDetails.parcel.weight || '0') * 2.5;
      setRouteInfo({ distance, time, cost });
    } else {
      setRouteInfo(null);
    }
  }, [orderDetails.pickupAddress, orderDetails.deliveryAddress, orderDetails.parcel.weight]);

  const validateForm = (): boolean => {
    const postalCodeRegex = /^\d{5}$/;

    if (!isAddressComplete(orderDetails.pickupAddress)) {
      setFormError("L'adresse de ramassage est incomplète. Veuillez vérifier la rue, la ville et le code postal.");
      return false;
    }
    if (!postalCodeRegex.test(orderDetails.pickupAddress.postalCode)) {
      setFormError("Le code postal de ramassage est invalide. Il doit comporter 5 chiffres.");
      return false;
    }
    if (!isAddressComplete(orderDetails.deliveryAddress)) {
      setFormError("L'adresse de livraison est incomplète. Veuillez vérifier la rue, la ville et le code postal.");
      return false;
    }
    if (!postalCodeRegex.test(orderDetails.deliveryAddress.postalCode)) {
        setFormError("Le code postal de livraison est invalide. Il doit comporter 5 chiffres.");
        return false;
    }
    if (!orderDetails.pickupDateTime) {
      setFormError("Veuillez sélectionner une date et une heure pour le ramassage.");
      return false;
    }
    if (!orderDetails.parcel.weight || !orderDetails.parcel.contents) {
      setFormError("Les détails du colis sont incomplets. Le poids et la description du contenu sont obligatoires.");
      return false;
    }
    if (!orderDetails.customer.name) {
      setFormError("Veuillez saisir votre nom complet.");
      return false;
    }
    if (!orderDetails.customer.phone) {
      setFormError("Veuillez saisir votre numéro de téléphone.");
      return false;
    }

    const phoneRegex = /^0[1-9](?:[ _.-]?\d{2}){4}$/;
    if (!phoneRegex.test(orderDetails.customer.phone)) {
        setFormError("Le format du numéro de téléphone est invalide. Il doit comporter 10 chiffres et commencer par 0 (ex: 06 12 34 56 78).");
        return false;
    }
    
    if (!orderDetails.customer.email) {
      setFormError("Une adresse e-mail est requise pour la confirmation.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(orderDetails.customer.email)) {
      setFormError("Le format de l'adresse e-mail est invalide.");
      return false;
    }

    setFormError(null);
    return true;
  }

  const handleProceedToSummary = () => {
    if (validateForm()) {
      setStage(Stage.SUMMARY);
    }
  };

  const handleConfirmOrder = async () => {
    setIsConfirming(true);
    setFormError(null);
    setNotificationError(null);

    try {
      const aiConfirmationMessage = await generateConfirmationMessage(orderDetails);
      setConfirmationMessage(aiConfirmationMessage);
      
      const smsPromise = sendSmsNotification(orderDetails);
      const emailPromise = (orderDetails.customer.email)
        ? sendEmailNotification(
            orderDetails.customer.email,
            `Confirmation de votre commande Livraison DK2`,
            aiConfirmationMessage
          )
        : Promise.resolve();

      const results = await Promise.allSettled([smsPromise, emailPromise]);
      
      const failedNotifications: string[] = [];
      if (results[0].status === 'rejected') {
          console.error("SMS notification failed:", results[0].reason);
          failedNotifications.push("SMS");
      }
      if (results[1].status === 'rejected') {
          console.error("Email notification failed:", results[1].reason);
          failedNotifications.push("e-mail");
      }

      if (failedNotifications.length > 0) {
          setNotificationError(`Votre commande a été enregistrée avec succès ! Cependant, un problème technique nous a empêchés de vous envoyer la confirmation par ${failedNotifications.join(' et ')}. Pas d'inquiétude, votre ramassage est bien programmé. Veuillez noter votre numéro de suivi pour référence.`);
      }

      setStage(Stage.CONFIRMED);
    } catch (error) {
      console.error("Failed to confirm order:", error);
      setFormError(`Échec de la confirmation de la commande : ${(error as Error).message}`);
    } finally {
      setIsConfirming(false);
    }
  };
  
  const handleStartNewOrder = () => {
    setOrderDetails(initialOrderDetails);
    setPickupDate('');
    setPickupTime('');
    setStage(Stage.FORM);
    setRouteInfo(null);
    setConfirmationMessage('');
    setFormError(null);
    setNotificationError(null);
    setFormInfo(null);
  };

  const getPlaceholderForCategory = (category: ParcelCategory) => {
    switch (category) {
        case ParcelCategory.FRAGILE:
            return "ex: Manipuler avec soin, ne pas empiler, protéger des chocs.";
        case ParcelCategory.HAZARDOUS:
            return "ex: Maintenir à la verticale, nécessite une ventilation, équipement de protection requis.";
        case ParcelCategory.OVERSIZED:
            return "ex: Nécessite un chariot élévateur, dégager la zone de livraison.";
        default:
            return "ex: Conserver au sec, éviter la lumière directe du soleil.";
    }
  };

  const renderForm = () => (
    <>
      <div className="space-y-8 divide-y divide-gray-200 dark:divide-gray-700">
        <AddressInput id="pickupAddress" title="Point de ramassage" address={orderDetails.pickupAddress} onAddressChange={handleAddressChange} onUseGeolocation={handleUseGeolocation} isGeolocationLoading={isGeolocationLoading}/>
        <div className="pt-8">
            <AddressInput id="deliveryAddress" title="Détails de la Livraison" address={orderDetails.deliveryAddress} onAddressChange={handleAddressChange} />
        </div>
        <div className="pt-8">
          <fieldset>
            <legend className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2"><CalendarIcon /> Heure du Ramassage</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative" ref={calendarRef}>
                <label htmlFor="pickup-date-display" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                 <div
                  id="pickup-date-display"
                  onClick={() => setIsCalendarOpen(true)}
                  className="mt-1 flex justify-between items-center w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 cursor-pointer"
                  role="button"
                  aria-haspopup="true"
                  aria-expanded={isCalendarOpen}
                >
                  <span>
                    {pickupDate
                      ? new Date(pickupDate + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                      : <span className="text-gray-500 dark:text-gray-400">Sélectionnez une date</span>
                    }
                  </span>
                  <div className="h-6 w-6 text-gray-400 dark:text-gray-500"><CalendarIcon /></div>
                </div>

                {isCalendarOpen && (
                  <Calendar
                    selectedDate={pickupDate}
                    onDateChange={(date) => {
                      setPickupDate(date);
                      setIsCalendarOpen(false);
                    }}
                    onClose={() => setIsCalendarOpen(false)}
                  />
                )}
                
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                        setPickupDate(new Date().toISOString().split('T')[0]);
                        setIsCalendarOpen(false);
                    }}
                    className="px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/50"
                  >
                    Aujourd'hui
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setPickupDate(tomorrow.toISOString().split('T')[0]);
                      setIsCalendarOpen(false);
                    }}
                    className="px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/50"
                  >
                    Demain
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="pickup-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Heure</label>
                <select
                  id="pickup-time"
                  name="pickupTime"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="" disabled>Sélectionnez une heure</option>
                  {timeSlots.map(slot => (
                    <option key={slot.value} value={slot.value}>{slot.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>
        </div>
        <div className="pt-8">
            <fieldset>
                <legend className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2"><PackageIcon /> Détails du Colis</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Poids (kg)</label><input type="number" name="weight" data-section="parcel" value={orderDetails.parcel.weight} onChange={handleSimpleInputChange} placeholder="50" className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Longueur (cm)</label><input type="number" name="length" data-section="parcel" value={orderDetails.parcel.length} onChange={handleSimpleInputChange} placeholder="100" className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Largeur (cm)</label><input type="number" name="width" data-section="parcel" value={orderDetails.parcel.width} onChange={handleSimpleInputChange} placeholder="80" className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hauteur (cm)</label><input type="number" name="height" data-section="parcel" value={orderDetails.parcel.height} onChange={handleSimpleInputChange} placeholder="60" className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" /></div>
                    <div className="md:col-span-2 lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Catégorie de Contenu</label>
                        <select
                            name="category"
                            data-section="parcel"
                            value={orderDetails.parcel.category}
                            onChange={handleSimpleInputChange}
                            className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            {Object.values(ParcelCategory).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-2 lg:col-span-4"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description du Contenu</label><textarea name="contents" data-section="parcel" value={orderDetails.parcel.contents} onChange={handleSimpleInputChange} placeholder="ex: Pièces de machine, Palette de boîtes" rows={3} className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" /></div>
                    <div className="md:col-span-2 lg:col-span-4">
                        <label htmlFor="special-instructions" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Instructions de Manutention Spéciales (Optionnel)</label>
                        <textarea
                            id="special-instructions"
                            name="specialInstructions"
                            data-section="parcel"
                            value={orderDetails.parcel.specialInstructions}
                            onChange={handleSimpleInputChange}
                            placeholder={getPlaceholderForCategory(orderDetails.parcel.category)}
                            rows={3}
                            className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>
                    {routeInfo && (
                        <div className="md:col-span-2 lg:col-span-4">
                            <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg text-center">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Itinéraire et Coût Estimés</h3>
                                <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{routeInfo.cost.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{routeInfo.distance} km / ~{routeInfo.time} minutes</p>
                            </div>
                        </div>
                    )}
                </div>
            </fieldset>
        </div>
        <div className="pt-8">
            <fieldset>
                <legend className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2"><UserIcon /> Coordonnées du Client</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nom Complet</label>
                        <input type="text" name="name" data-section="customer" value={orderDetails.customer.name} onChange={handleSimpleInputChange} placeholder="Jean Dupont" className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Numéro de Téléphone</label>
                        <input type="tel" name="phone" data-section="customer" value={orderDetails.customer.phone} onChange={handleSimpleInputChange} placeholder="06-12-34-56-78" className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Adresse E-mail</label>
                        <input type="email" name="email" data-section="customer" value={orderDetails.customer.email} onChange={handleSimpleInputChange} placeholder="jean.dupont@example.com" className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                </div>
            </fieldset>
        </div>
      </div>
      
      {formInfo && (
        <Alert 
          type="info"
          title="Information"
          message={formInfo}
          onClose={() => setFormInfo(null)}
        />
      )}
      {formError && (
        <Alert
          type="error"
          title="Erreur de Saisie"
          message={formError}
          onClose={() => setFormError(null)}
        />
      )}
      <div className="pt-8 flex justify-end">
        <button onClick={handleProceedToSummary} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition transform hover:scale-105">
          Vérifier la Commande
        </button>
      </div>
    </>
  );

  const renderSummary = () => (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Résumé de la Commande</h2>
        <div className="p-6 bg-blue-50 dark:bg-gray-700/50 rounded-lg border border-blue-200 dark:border-blue-800 space-y-4">
            <div><strong className="font-semibold text-gray-800 dark:text-gray-200">Ramassage :</strong> {orderDetails.pickupAddress.street}, {orderDetails.pickupAddress.city}</div>
            <div><strong className="font-semibold text-gray-800 dark:text-gray-200">Livraison :</strong> {orderDetails.deliveryAddress.street}, {orderDetails.deliveryAddress.city}</div>
            <div><strong className="font-semibold text-gray-800 dark:text-gray-200">Heure :</strong> {new Date(orderDetails.pickupDateTime).toLocaleString('fr-FR')}</div>
            <div><strong className="font-semibold text-gray-800 dark:text-gray-200">Colis :</strong> {orderDetails.parcel.contents} ({orderDetails.parcel.weight}kg) - <span className="font-medium text-blue-600 dark:text-blue-400">{orderDetails.parcel.category}</span></div>
            {orderDetails.parcel.specialInstructions && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/50 border-l-4 border-yellow-400 dark:border-yellow-500 rounded">
                  <strong className="font-semibold text-yellow-800 dark:text-yellow-200">Instructions Spéciales :</strong>
                  <p className="text-yellow-700 dark:text-yellow-300 mt-1">{orderDetails.parcel.specialInstructions}</p>
              </div>
            )}
            <div><strong className="font-semibold text-gray-800 dark:text-gray-200">Nom du contact :</strong> {orderDetails.customer.name}</div>
            <div><strong className="font-semibold text-gray-800 dark:text-gray-200">Téléphone :</strong> {orderDetails.customer.phone}</div>
            <div><strong className="font-semibold text-gray-800 dark:text-gray-200">E-mail :</strong> {orderDetails.customer.email}</div>
        </div>
        <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-48 md:h-64 rounded-lg flex items-center justify-center text-gray-500">
                <img src={`https://picsum.photos/seed/${orderDetails.pickupAddress.postalCode}/400/200`} alt="Espace réservé pour la carte" className="rounded-lg object-cover w-full h-full" />
            </div>
            {routeInfo && (
                <div className="flex-1 p-6 bg-gray-100 dark:bg-gray-900/50 rounded-lg flex flex-col justify-center items-center text-center">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Coût Final</h3>
                    <p className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 my-2">{routeInfo.cost.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{routeInfo.distance} km de trajet</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">~{routeInfo.time} minutes de trajet estimées</p>
                </div>
            )}
        </div>
         {formError && (
            <Alert
              type="error"
              title="Erreur de Confirmation"
              message={formError}
              onClose={() => setFormError(null)}
            />
        )}
        <div className="pt-5 flex justify-between items-center">
            <button onClick={() => setStage(Stage.FORM)} className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white font-medium py-2 px-4 rounded-lg">
                &larr; Retour à l'Édition
            </button>
            <button onClick={handleConfirmOrder} disabled={isConfirming} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition transform hover:scale-105 disabled:bg-green-400 disabled:cursor-wait">
                {isConfirming ? 'Confirmation en cours...' : 'Confirmer et Passer la Commande'}
            </button>
        </div>
    </div>
  );
  
  const renderConfirmation = () => (
    <div className="text-center py-10">
      <h2 className="text-3xl font-bold text-green-500 mb-4">Commande DK2 Confirmée !</h2>
      <div className="prose prose-lg dark:prose-invert mx-auto bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg text-left" dangerouslySetInnerHTML={{ __html: confirmationMessage.replace(/\n/g, '<br />') }} />
      
      {notificationError && (
        <div className="max-w-2xl mx-auto">
          <Alert 
            type="warning"
            title="Avertissement de Notification"
            message={notificationError}
            onClose={() => setNotificationError(null)}
          />
        </div>
      )}

      <button onClick={handleStartNewOrder} className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition transform hover:scale-105">
        Passer une Nouvelle Commande DK2
      </button>
    </div>
  );

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen font-sans text-gray-800 dark:text-gray-200">
      <main className="container mx-auto p-4 sm:p-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-10 w-full max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <TruckIcon />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Livraison DK2
            </h1>
          </div>
          
          {stage === Stage.FORM && renderForm()}
          {stage === Stage.SUMMARY && renderSummary()}
          {stage === Stage.CONFIRMED && confirmationMessage && renderConfirmation()}

        </div>
      </main>
    </div>
  );
};

export default App;