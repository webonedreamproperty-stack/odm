import { Customer, StoredTemplate, Template } from "../types";
import { loadFromStorage, saveToStorage } from "./storage";
import { fromStoredTemplate, toStoredTemplate } from "./templateSerialization";

const campaignsKey = (userId: string) => `cookees.${userId}.campaigns.v1`;
const customersKey = (userId: string) => `cookees.${userId}.customers.v1`;

export const loadUserCampaigns = (userId: string): Template[] | null => {
  const stored = loadFromStorage<StoredTemplate[]>(campaignsKey(userId));
  if (!stored || stored.length === 0) return null;
  return stored.map(fromStoredTemplate);
};

export const saveUserCampaigns = (userId: string, campaigns: Template[]) => {
  saveToStorage(campaignsKey(userId), campaigns.map(toStoredTemplate));
};

export const loadUserCustomers = (userId: string): Customer[] | null => {
  const stored = loadFromStorage<Customer[]>(customersKey(userId));
  if (!stored || stored.length === 0) return null;
  return stored;
};

export const saveUserCustomers = (userId: string, customers: Customer[]) => {
  saveToStorage(customersKey(userId), customers);
};
