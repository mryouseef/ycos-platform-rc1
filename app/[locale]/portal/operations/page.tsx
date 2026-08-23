import{M12Page}from"@/src/m12/m12-page";export default async function Page({params}:{params:Promise<{locale:string}>}){return <M12Page locale={(await params).locale}/>}
