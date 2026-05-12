import { NextRequest, NextResponse } from 'next/server'
import { mapErrorToResponse } from '@/server/errors/map-error'
import { employeeService } from '@/server/services/employee-service'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
  
    const data = {
      fullName: String(formData.get('fullName')),
      email: String(formData.get('email')),
      adUsername: String(formData.get('adUsername')),
    }

    const employee = await employeeService.create(data);
    
    return NextResponse.json(employee, { status: 201 })
  } catch(error) {
    return mapErrorToResponse(error);
  }
}