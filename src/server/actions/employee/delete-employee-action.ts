import { checkIdEmployeeSchema } from "@/schemas/employee-schema";
import { mapErrorToSafeResult } from "@/server/errors/map-error";
import { employeeService } from "@/server/services/employee-service";

export async function deleteEmployeeByIdAction(
  employeeId: string
) {
  const parsed = checkIdEmployeeSchema.safeParse({ 
    id: employeeId
  })
  
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors
    }  
  }

  const { id } = parsed.data;

  try {
    const document = await employeeService.deleteById(id);
    return { success: true, data: document }
  } catch(error) {
    return mapErrorToSafeResult(error)
  }
}