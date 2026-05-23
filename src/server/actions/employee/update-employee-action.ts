import { updateEmployeeByIdSchema } from "@/schemas/employee-schema";
import { mapErrorToSafeResult } from "@/server/errors/map-error";
import { employeeService } from "@/server/services/employee-service";

export async function updateEmployeeByIdAction(
  employeeId: string,
  formData: FormData
) {
  const filterKeys = [
    "adUsername", "fullName", "email", "department", 
    "position", "isActive",
  ];
  const filterData = Object.fromEntries(
    filterKeys.map((key) => [key, formData.get(key)])
  );

  const parsed = updateEmployeeByIdSchema.safeParse({
    id: employeeId,
    filterData
  })
  
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors
    }  
  }


  try {
    const document = await employeeService.update(parsed.data.id, parsed.data);
    return { success: true, data: document }
  } catch(error) {
    return mapErrorToSafeResult(error)
  }
}