
import { getPageSeo } from '@/lib/getPageSeo';
import ConsumerDisputesClient from './ConsumerDisputesClient';

export async function generateMetadata() {
  return getPageSeo('services/consumer-disputes', {
    title:       'Consumer Dispute Resolution Online | RaaziMarzi',
    description: 'Resolve consumer complaints and disputes online. Product issues, service complaints, delivery disputes — fast resolution through RaaziMarzi mediation.',
    keywords:    ['consumer dispute resolution india', 'consumer complaint resolution', 'online consumer forum india'],
    ogImage:     'https://raazimarzi.com/og/consumer-disputes.jpg',
  });
}


export default function ConsumerDisputes() {
   return <ConsumerDisputesClient />;
}
