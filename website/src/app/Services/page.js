
import { getPageSeo } from '@/lib/getPageSeo';
import ServicesClient from './ServicesClient';

export async function generateMetadata() {
  return getPageSeo('solutions', {
    title: 'About RaaziMarzi — India\'s Online Dispute Resolution Platform',
    description: 'Learn about RaaziMarzi, India\'s trusted online mediation platform.',
  });
}


export default function Services() {
    return <ServicesClient />;
}