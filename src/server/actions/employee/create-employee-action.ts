import { createEmployeeSchema } from "@/schemas/employee-schema";
import { mapErrorToSafeResult } from "@/server/errors/map-error";
import { employeeService } from "@/server/services/employee-service";

export async function createEmployeeAction(
  formData: FormData,
) {
  const parsed = createEmployeeSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    adUsername: formData.get("adUsername"),
    department: formData.get("department"),
    position: formData.get("position"),
    isActive: formData.get("isActive")
  })

  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors
    }
  }

  try {
    const employee = employeeService.create(parsed.data)
    return {
      success: true,
      data: employee
    }
  } catch(error) {
    return mapErrorToSafeResult(error);
  }

}