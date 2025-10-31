export interface Address {
  street: string;
  city: string;
  postalCode: string;
}

export enum ParcelCategory {
  GENERAL = 'Général',
  FRAGILE = 'Fragile',
  OVERSIZED = 'Hors gabarit',
  HAZARDOUS = 'Dangereux',
}

export interface Parcel {
  weight: string;
  length: string;
  width: string;
  height: string;
  contents: string;
  category: ParcelCategory;
  specialInstructions: string;
}

export interface Customer {
  name: string;
  phone: string;
  email: string;
}

export interface OrderDetails {
  pickupAddress: Address;
  deliveryAddress: Address;
  pickupDateTime: string;
  parcel: Parcel;
  customer: Customer;
}

export enum Stage {
  FORM,
  SUMMARY,
  CONFIRMED,
}