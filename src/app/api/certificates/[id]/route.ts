import { NextRequest, NextResponse } from 'next/server'
import { mapErrorToResponse } from '@/server/errors/map-error';
import { employeeService } from '@/server/services/employee-service';

// export async function GET(
//   _req: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id } = await params
//     const certificate = await certificateService.findByIdOrThrow(id);
  
//     const url = await getPresignedUrl(certificate.fileKey)
//     console.log("url", url);
    
//     return NextResponse.json(url)
//   } catch(error) {
//     return mapErrorToResponse(error);
//   }
// }

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const employee = await employeeService.deleteById(id);
    return NextResponse.json(employee)
  } catch(error) {
    return mapErrorToResponse(error);
  }
}