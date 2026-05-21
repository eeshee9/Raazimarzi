
import { getPageSeo } from '@/lib/getPageSeo';
import NeighborDisputesClient from './NeighborDisputesClient';

export async function generateMetadata() {
  return getPageSeo('services/neighbour-disputes', {
    title:       'Neighbour Dispute Resolution Online | RaaziMarzi',
    description: 'Resolve neighbour and community disputes peacefully through online mediation. Noise, boundary, property access conflicts resolved quickly.',
    keywords:    ['neighbour dispute resolution india', 'community dispute mediation', 'resolve neighbour conflict'],
    ogImage:     'https://raazimarzi.com/og/neighbour-disputes.jpg',
  });
}

export default function NeighborDispute() {
    return <NeighborDisputesClient />;
}