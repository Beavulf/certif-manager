export function parseFormBoolean(
  value: FormDataEntryValue | null,
): boolean | undefined {
  if (value === null || value === '') return undefined;
  if (value === 'true' || value === 'on') return true;
  if (value === 'false' || value === 'off') return false;
  if (typeof value === 'boolean') return value;
  return undefined;
}

export function appendEmployeeFormFields(
  formData: FormData,
  values: {
    fullName: string;
    email: string;
    adUsername: string;
    department?: string;
    position?: string;
    isActive?: boolean;
  },
) {
  formData.set('fullName', values.fullName);
  formData.set('email', values.email);
  formData.set('adUsername', values.adUsername);
  formData.set('department', values.department ?? '');
  formData.set('position', values.position ?? '');
  if (values.isActive !== undefined) {
    formData.set('isActive', String(values.isActive));
  }
}
