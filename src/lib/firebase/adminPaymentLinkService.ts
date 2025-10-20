// Admin Payment Link Config Service
// This file manages country-specific payment links for manual wallet deposits
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PAYMENT_LINKS_DOC = 'paymentLinks/config';

export const adminPaymentLinkService = {
  async getPaymentLinks(): Promise<Record<string, string>> {
    const docRef = doc(db, PAYMENT_LINKS_DOC);
    const snap = await getDoc(docRef);
    return (snap.exists() ? snap.data() : {}) as Record<string, string>;
  },
  async setPaymentLink(country: string, link: string) {
    const docRef = doc(db, PAYMENT_LINKS_DOC);
    await setDoc(docRef, { [country]: link }, { merge: true });
  },
};
