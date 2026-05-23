import { checkAdUsernameEmployeeSchema, checkIdEmployeeSchema } from "@/schemas/employee-schema";
import { mapErrorToSafeResult } from "@/server/errors/map-error";
import { employeeService } from "@/server/services/employee-service";

export async function getEmployeeByIdAction(
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
    const document = await employeeService.findById(id);
    return { success: true, data: document }
  } catch(error) {
    return mapErrorToSafeResult(error)
  }
}

export async function getEmployeeByAdUsernameAction(
  login: string
) {
  const parsed = checkAdUsernameEmployeeSchema.safeParse({ 
    adUsername: login
  })
  
  if (!parsed.success) {
    return {
      success: false,
      error: 'Ошибка валидации',
      fieldErrors: parsed.error.flatten().fieldErrors
    }  
  }

  const { adUsername } = parsed.data;

  try {
    const document = await employeeService.findByAdUsername(adUsername, true);
    return { success: true, data: document }
  } catch(error) {
    return mapErrorToSafeResult(error)
  }
}

// export async function getEmployeesByFilterAction(
//   formData: FormData
// ) {
//   const filterKeys = [
//     "adUsername", "fullName", "email", "department", 
//     "position", "isActive", "createdAt", "updatedAt"
//   ];
//   const filterData = Object.fromEntries(
//     filterKeys.map((key) => [key, formData.get(key)])
//   );

//   const parsed = getDocumentByFilterSchema.safeParse({ filterData })
  
//   if (!parsed.success) {
//     return {
//       success: false,
//       error: 'Ошибка валидации',
//       fieldErrors: parsed.error.flatten().fieldErrors
//     }  
//   }

//   const where = Object.fromEntries(
//     Object.entries(parsed.data).filter(([_, v]) => v != null && v !== "")
//   );
  
//   try {
//     const employees = await employeeService.findMany({
//       where,
//       include: {
//         certificates: true
//       },
//       orderBy: {
//         createdAt: 'desc'
//       }
//     });
    
//     return { success: true, data: employees }
//   } catch(error) {
//     return mapErrorToSafeResult(error)
//   }
// }