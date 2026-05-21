
import { getPageSeo } from '@/lib/getPageSeo';
import IndividualDisputesClient from './IndividualDisputesClient';

export async function generateMetadata() {
  return getPageSeo('services/individual-disputes', {
    title:       'Individual Dispute Resolution Online | RaaziMarzi',
    description: 'Resolve individual disputes online through RaaziMarzi\'s mediation platform. Property, family, neighbour disputes resolved quickly and affordably.',
    keywords:    ['individual dispute resolution', 'personal disputes india', 'resolve individual disputes online'],
    ogImage:     'https://raazimarzi.com/og/individual-disputes.jpg',
  });
}

export default function IndividualDisputes() {
  return <IndividualDisputesClient />;
}