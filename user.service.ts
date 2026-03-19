// src/app/services/user.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, RoleDistribution } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  // BehaviorSubject for managing user state
  private usersSubject = new BehaviorSubject<User[]>([
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Editor' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'Viewer' }
  ]);

  // Observable for components to subscribe to
  public users$: Observable<User[]> = this.usersSubject.asObservable();

  constructor() {}

  /**
   * Get current users value
   */
  getUsers(): User[] {
    return this.usersSubject.value;
  }

  /**
   * Add new user and emit updated state
   */
  addUser(user: Omit<User, 'id'>): void {
    const newUser: User = {
      ...user,
      id: this.generateId()
    };

    const currentUsers = this.usersSubject.value;
    this.usersSubject.next([...currentUsers, newUser]);
  }

  /**
   * Get role distribution for chart
   */
  getRoleDistribution(): Observable<RoleDistribution[]> {
    return new Observable(observer => {
      this.users$.subscribe(users => {
        const distribution = this.calculateRoleDistribution(users);
        observer.next(distribution);
      });
    });
  }

  /**
   * Calculate role distribution from users array
   */
  private calculateRoleDistribution(users: User[]): RoleDistribution[] {
    const roleCount: { [key: string]: number } = {
      'Admin': 0,
      'Editor': 0,
      'Viewer': 0
    };

    users.forEach(user => {
      roleCount[user.role]++;
    });

    return Object.entries(roleCount).map(([role, count]) => ({
      role,
      count
    }));
  }

  /**
   * Generate unique ID for new users
   */
  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
}
