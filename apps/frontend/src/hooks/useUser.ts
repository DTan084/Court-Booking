import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import type { User } from '@/types';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async (data: Partial<Pick<User, 'name' | 'phone' | 'avatarUrl' | 'dob'>>) => {
      const response = await api.patch<{ success: boolean; data: User }>('/users/me', data);
      return response.data.data;
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.setQueryData(['users', 'me'], updatedUser);
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    },
  });
}

export function useUploadAvatar() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post<{ success: boolean; data: { url: string } }>(
        '/users/me/avatar',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );
      return response.data.data.url;
    },
  });
}
