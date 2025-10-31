import { GoogleGenAI } from "@google/genai";
import type { OrderDetails } from '../types';

const MODEL_NAME = "gemini-2.5-flash";

/**
 * Simulates sending an SMS notification.
 * In a real application, this would call a third-party SMS gateway API.
 */
export async function sendSmsNotification(orderDetails: OrderDetails): Promise<void> {
  const pickupDate = new Date(orderDetails.pickupDateTime).toLocaleDateString('fr-FR');
  const pickupTime = new Date(orderDetails.pickupDateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  
  const message = `Livraison DK2: Votre commande est confirmée pour le ${pickupDate} à ${pickupTime} vers ${orderDetails.deliveryAddress.city}. Merci !`;

  console.log(`Envoi d'un SMS au ${orderDetails.customer.phone}: "${message}"`);
  
  // Simulate network delay and potential failure for an API call
  return new Promise((resolve, reject) => setTimeout(() => {
    // Simulate a 20% chance of failure
    if (Math.random() < 0.2) {
      console.error("Échec de la simulation d'envoi de SMS.");
      reject(new Error("La passerelle SMS n'a pas répondu."));
    } else {
      console.log("SMS envoyé avec succès (simulation).");
      resolve();
    }
  }, 500));
}

/**
 * Simulates sending an email notification.
 */
export async function sendEmailNotification(emailAddress: string, subject: string, body: string): Promise<void> {
  console.log(`Envoi d'un e-mail à ${emailAddress}`);
  console.log(`Sujet: ${subject}`);
  console.log(`Corps: ${body.replace(/<br \/>/g, '\n')}`);

  // Simulate network delay and potential failure for an API call
  return new Promise((resolve, reject) => setTimeout(() => {
    // Simulate a 20% chance of failure
    if (Math.random() < 0.2) {
        console.error("Échec de la simulation d'envoi d'e-mail.");
        reject(new Error("Le serveur de messagerie a refusé la connexion."));
    } else {
        console.log("E-mail envoyé avec succès (simulation).");
        resolve();
    }
  }, 500));
}

export async function generateConfirmationMessage(orderDetails: OrderDetails): Promise<string> {
  const confirmationChannelsText = "Une confirmation par SMS et par e-mail vous a également été envoyée.";

  if (!process.env.API_KEY) {
    return Promise.resolve(`**Commande Reçue !**

Merci, ${orderDetails.customer.name}. Votre commande de transport avec Livraison DK2 a été passée avec succès.

**Résumé :**
- **Ramassage :** ${orderDetails.pickupAddress.street}, ${orderDetails.pickupAddress.city}, ${orderDetails.pickupAddress.postalCode}
- **Livraison :** ${orderDetails.deliveryAddress.street}, ${orderDetails.deliveryAddress.city}, ${orderDetails.deliveryAddress.postalCode}
- **Prévu pour le :** ${new Date(orderDetails.pickupDateTime).toLocaleString('fr-FR')}
- **Contenu du colis :** ${orderDetails.parcel.contents} (${orderDetails.parcel.category})${orderDetails.parcel.specialInstructions ? `\n\n**Instructions Spéciales de Manutention:**\n*${orderDetails.parcel.specialInstructions}*` : ''}

**Votre numéro de suivi est : FAKE-TRK-123456789.**

Nous vous informerons par téléphone au ${orderDetails.customer.phone} lorsque notre chauffeur sera en route. ${confirmationChannelsText} Nous vous remercions de votre confiance !

*(Ceci est une confirmation simulée car la clé API n'est pas disponible.)*`);
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Vous êtes un assistant intelligent pour une entreprise de transport industriel nommée "Livraison DK2".
    Un client vient de soumettre une nouvelle commande de livraison de colis.
    Votre tâche est de générer un message de confirmation amical et professionnel en français.

    Le message doit :
    1. Remercier le client par son nom.
    2. Résumer brièvement les détails clés de la commande (ramassage, livraison, heure prévue).
    3. Fournir un numéro de suivi fictif et unique au format 'DK2-XXXX-XXXX'.
    4. Confirmer qu'il sera averti par téléphone pour le ramassage.
    5. Mentionner que ${confirmationChannelsText}.
    6. Si des instructions spéciales de manutention sont fournies, les faire ressortir clairement dans une section dédiée intitulée "**Instructions Spéciales de Manutention**". Le contenu des instructions doit être mis en évidence (par exemple, en italique ou dans un bloc de citation). Ne pas inclure cette section si aucune instruction n'est fournie.
    7. Être formaté en Markdown pour l'affichage.

    Voici les détails de la commande :
    - Nom du client : ${orderDetails.customer.name}
    - Téléphone du client : ${orderDetails.customer.phone}
    - E-mail du client : ${orderDetails.customer.email || 'Non fourni'}
    - Adresse de ramassage : ${orderDetails.pickupAddress.street}, ${orderDetails.pickupAddress.city}, ${orderDetails.pickupAddress.postalCode}
    - Adresse de livraison : ${orderDetails.deliveryAddress.street}, ${orderDetails.deliveryAddress.city}, ${orderDetails.deliveryAddress.postalCode}
    - Date et heure de ramassage : ${new Date(orderDetails.pickupDateTime).toLocaleString('fr-FR')}
    - Poids du colis : ${orderDetails.parcel.weight} kg
    - Dimensions du colis : ${orderDetails.parcel.length}x${orderDetails.parcel.width}x${orderDetails.parcel.height} cm
    - Contenu du colis : ${orderDetails.parcel.contents}
    - Catégorie du colis : ${orderDetails.parcel.category}
    - Instructions spéciales : ${orderDetails.parcel.specialInstructions || 'Aucune'}

    Générez le message de confirmation maintenant.
  `;

  try {
    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating confirmation message:", error);
    throw new Error("L'assistant IA n'a pas pu générer de confirmation. Cause : " + (error as Error).message);
  }
}