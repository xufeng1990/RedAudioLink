import { apiRequest } from './client';

export type UserProfileDto = {
  employeeName: string;
  employeeId: string;
  businessId: string;
  telephoneNumber: string;
  emailAddress: string;
};

export async function fetchProfile(): Promise<UserProfileDto> {
  const data = await apiRequest<{ profile: UserProfileDto }>('/api/profile');
  return data.profile;
}

export async function updateProfile(
  input: Partial<UserProfileDto>,
): Promise<UserProfileDto> {
  const data = await apiRequest<{ profile: UserProfileDto }>('/api/profile', {
    method: 'PATCH',
    body: input,
  });
  return data.profile;
}
