
import { getPageSeo } from '@/lib/getPageSeo';
import AboutUsClient from './AboutUsClient';

export async function generateMetadata() {
  return getPageSeo('about-us', {
    title:       'About RaaziMarzi — India\'s Online Dispute Resolution Platform',
    description: 'Learn about RaaziMarzi, India\'s trusted online mediation and dispute resolution platform. Our mission, values, and expert team.',
    keywords:    ['about raazimarzi', 'online mediation india', 'dispute resolution platform india'],
    ogImage:     'https://raazimarzi.com/og/about.jpg',
  });
}


export default function AboutUs() {
  return <AboutUsClient />;
}