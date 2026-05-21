
import { getPageSeo } from '@/lib/getPageSeo';
import ContactUsClientClient from './ContactUsClient';

export async function generateMetadata() {
  return getPageSeo('contact-us', {
    title:       'Contact RaaziMarzi — Get in Touch for Dispute Resolution',
    description: 'Contact RaaziMarzi to start your online dispute resolution process. Reach our mediation experts today.',
    keywords:    ['contact raazimarzi', 'dispute resolution contact', 'mediation help india'],
    ogImage:     'https://raazimarzi.com/og/contact.jpg',
  });
}
 

export default function ContactUs() {
   return <ContactUsClient />;
}