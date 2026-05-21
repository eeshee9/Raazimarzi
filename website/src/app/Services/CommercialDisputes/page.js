
import { getPageSeo } from '@/lib/getPageSeo';
import CommercialDisputesClient from './CommercialDisputesClient';


export async function generateMetadata() {
  return getPageSeo('services/commercial-disputes', {
    title:       'Commercial Dispute Resolution Online | RaaziMarzi',
    description: 'Resolve commercial and business disputes online through expert mediation. Trade disputes, contract issues, business conflicts resolved efficiently.',
    keywords:    ['commercial dispute resolution india', 'business dispute mediation', 'trade dispute resolution'],
    ogImage:     'https://raazimarzi.com/og/commercial-disputes.jpg',
  });
}


export default function CommercialDisputes() {
  return <CommercialDisputesClient />;
}