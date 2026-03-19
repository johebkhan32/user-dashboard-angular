// src/app/models/user.model.ts

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Editor' | 'Viewer';
}

export interface RoleDistribution {
  role: string;
  count: number;
}
