
import { getPageSeo } from '@/lib/getPageSeo';
import ContractDisputesClient from './ContractDisputesClient';
;

export async function generateMetadata() {
  return getPageSeo('services/contract-disputes', {
    title:       'Contract Dispute Resolution Online | RaaziMarzi',
    description: 'Resolve contract disputes online through expert mediation. Breach of contract, agreement violations, contract termination disputes handled efficiently.',
    keywords:    ['contract dispute resolution india', 'breach of contract mediation', 'resolve contract dispute online'],
    ogImage:     'https://raazimarzi.com/og/contract-disputes.jpg',
  });
}

export default function ContractDispute() {
    return <ContractDisputesClient />;
}