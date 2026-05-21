

import { getPageSeo } from '@/lib/getPageSeo';
import HomeClient from './HomeClient';

export async function generateMetadata() {
  return getPageSeo('home', {
    title:       'RaaziMarzi — Online Dispute Resolution in India',
    description: 'Fast, affordable and confidential mediation for personal, consumer and commercial disputes. India\'s trusted online dispute resolution platform.',
    keywords:    ['online dispute resolution india', 'mediation platform india', 'resolve disputes online'],
    ogImage:     'https://raazimarzi.com/assets/images/hero-bg.png',
  });
}

export default function HomePage() {
  return <HomeClient />;
}