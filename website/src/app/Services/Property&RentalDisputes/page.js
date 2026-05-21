
import { getPageSeo } from '@/lib/getPageSeo';
import PropertyDisputesClient from './Property&RentalDisputesClient';

export async function generateMetadata() {
  return getPageSeo('services/property-rental-disputes', {
    title:       'Property & Rental Dispute Resolution Online | RaaziMarzi',
    description: 'Resolve property and rental disputes online through expert mediation. Tenant-landlord conflicts, rent disputes, property damage resolved quickly.',
    keywords:    ['property dispute resolution india', 'rental dispute mediation', 'landlord tenant dispute india'],
    ogImage:     'https://raazimarzi.com/og/property-disputes.jpg',
  });
}



export default function PropertyDisputes() {
     return <PropertyDisputesClient />;
}