// import { NextRequest, NextResponse } from 'next/server'
// import { certificateService } from '@/server/services/certificate-service'
// import { mapErrorToResponse } from '@/server/errors/map-error'

// export async function POST(req: NextRequest) {
//   try {
//     const formData = await req.formData()
//     const file = formData.get('file') as File
//     const employeeId = String(formData.get('employeeId'))
  
//     if (!file || !employeeId) {
//       return NextResponse.json({ error: 'Не переданы file или employeeId' }, { status: 400 })
//     }
  
//     const buffer = Buffer.from(await file.arrayBuffer())
    
//     const certificate = await certificateService.create(
//       employeeId,
//       file.name,
//       "admin",
//       file.type,
//       buffer,
//     )
  
//     return NextResponse.json(certificate, { status: 201 })
//   } catch(error) {
//     return mapErrorToResponse(error);
//   }
// }