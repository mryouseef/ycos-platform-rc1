/** PXSI-01 route: isolated local product experience; public and legacy portal routes remain unchanged. */
import { ProductWorkspace } from '@/components/product-workspace'
export default async function Workspace({params}:{params:Promise<{locale:string}>}){const {locale}=await params;return <ProductWorkspace locale={locale}/>} 
