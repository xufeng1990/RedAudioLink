import { apiRequest } from './client';

export type TaskStatus = 'pending' | 'completed';

export type TaskDto = {
  id: string;
  userId: string;
  title: string;
  taskId: string;
  address: string;
  stateProvince: string;
  postalCode: string;
  client: string;
  contactNumber: string;
  inspectionDate: string;
  status: TaskStatus;
  createdAt: string;
};

export type CreateTaskInput = {
  title: string;
  taskId: string;
  address: string;
  stateProvince: string;
  postalCode: string;
  client?: string;
  contactNumber?: string;
  inspectionDate?: string;
};

export type UpdateTaskInput = Partial<CreateTaskInput> & {
  status?: TaskStatus;
};

export async function fetchTasks(): Promise<TaskDto[]> {
  const data = await apiRequest<{ tasks: TaskDto[] }>('/api/tasks');
  return data.tasks;
}

export async function createTask(input: CreateTaskInput): Promise<TaskDto> {
  const data = await apiRequest<{ task: TaskDto }>('/api/tasks', {
    method: 'POST',
    body: input,
  });
  return data.task;
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput,
): Promise<TaskDto> {
  const data = await apiRequest<{ task: TaskDto }>(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: input,
  });
  return data.task;
}

export async function deleteTask(id: string): Promise<void> {
  await apiRequest<{ ok: true }>(`/api/tasks/${id}`, { method: 'DELETE' });
}
