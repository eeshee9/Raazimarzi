
import { getPageSeo } from '@/lib/getPageSeo';
import ProductComplaintsClient from './ProductComplaintsClient';

export async function generateMetadata() {
  return getPageSeo('services/product-disputes', {
    title:       'Product Complaint Dispute Resolution Online | RaaziMarzi',
    description: 'Resolve complaints.',
    keywords:    [''],
    ogImage:     'https://raazimarzi.com/og/product-complaints.jpg',
  });
}
export default function ProductComplaints() {
  return <ProductComplaintsClient />;
}