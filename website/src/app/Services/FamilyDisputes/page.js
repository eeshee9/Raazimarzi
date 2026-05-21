
import { getPageSeo } from '@/lib/getPageSeo';
import FamilyDisputesClient from './FamilyDisputesClient';

export async function generateMetadata() {
  return getPageSeo('services/family-disputes', {
    title:       'Family Dispute Resolution Online | RaaziMarzi',
    description: 'Resolve family disputes sensitively and privately through RaaziMarzi mediation. Divorce, custody, matrimonial disputes handled with care.',
    keywords:    ['family dispute resolution india', 'divorce mediation india', 'matrimonial dispute resolution'],
    ogImage:     'https://raazimarzi.com/og/family-disputes.jpg',
  });
}

export default function FamilyDisputes() {
      return <FamilyDisputesClient />;
}