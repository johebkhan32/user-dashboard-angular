// src/app/components/user-dashboard/user-dashboard.component.ts

import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ComponentFactoryResolver, ViewContainerRef, ComponentRef } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';

Chart.register(...registerables);

@Component({
  selector: 'app-user-dashboard',
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.css']
})
export class UserDashboardComponent implements OnInit, OnDestroy {
  @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('modalContainer', { read: ViewContainerRef, static: false }) modalContainer!: ViewContainerRef;

  users: User[] = [];
  showModal = false;
  isLoading = false;
  chart: Chart | null = null;
  private destroy$ = new Subject<void>();

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // Filtering
  searchTerm = '';
  selectedRoleFilter = '';

  constructor(
    private userService: UserService,
    private componentFactoryResolver: ComponentFactoryResolver
  ) {}

  ngOnInit(): void {
    // Subscribe to users$ observable
    this.userService.users$
      .pipe(takeUntil(this.destroy$))
      .subscribe(users => {
        this.users = users;
        this.calculatePagination();
        this.updateChart();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.chart) {
      this.chart.destroy();
    }
  }

  /**
   * Open modal - Lazy load UserFormComponent
   */
  async openModal(): Promise<void> {
    this.showModal = true;
    
    // Lazy load the UserFormComponent
    const { UserFormComponent } = await import('../user-form/user-form.component');
    
    if (this.modalContainer) {
      this.modalContainer.clear();
      const componentFactory = this.componentFactoryResolver.resolveComponentFactory(UserFormComponent);
      const componentRef: ComponentRef<any> = this.modalContainer.createComponent(componentFactory);
      
      // Subscribe to component outputs
      componentRef.instance.userSubmitted.subscribe((userData: any) => {
        this.onUserAdded(userData);
      });
      
      componentRef.instance.closeModal.subscribe(() => {
        this.closeModal();
      });
    }
  }

  /**
   * Close modal
   */
  closeModal(): void {
    this.showModal = false;
    if (this.modalContainer) {
      this.modalContainer.clear();
    }
  }

  /**
   * Handle new user submission
   */
  onUserAdded(userData: Omit<User, 'id'>): void {
    this.isLoading = true;
    
    // Simulate async operation
    setTimeout(() => {
      this.userService.addUser(userData);
      this.isLoading = false;
    }, 300);
  }

  /**
   * Update Chart.js pie chart
   */
  private updateChart(): void {
    if (!this.chartCanvas) {
      // Chart canvas not ready yet
      setTimeout(() => this.updateChart(), 100);
      return;
    }

    const roleCount = this.getRoleDistribution();
    
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'pie',
      data: {
        labels: ['Admin', 'Editor', 'Viewer'],
        datasets: [{
          data: [roleCount.Admin, roleCount.Editor, roleCount.Viewer],
          backgroundColor: [
            '#1c4980',
            '#2c69b0',
            '#5a9dd8'
          ],
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: {
                size: 13
              },
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: '#383838',
            padding: 12,
            titleFont: {
              size: 14
            },
            bodyFont: {
              size: 13
            },
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0) as number;
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        },
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 800
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }

  /**
   * Get role distribution for chart
   */
  private getRoleDistribution(): { [key: string]: number } {
    const distribution = {
      'Admin': 0,
      'Editor': 0,
      'Viewer': 0
    };

    this.users.forEach(user => {
      distribution[user.role]++;
    });

    return distribution;
  }

  /**
   * Get filtered users
   */
  get filteredUsers(): User[] {
    let filtered = [...this.users];

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
      );
    }

    // Apply role filter
    if (this.selectedRoleFilter) {
      filtered = filtered.filter(user => user.role === this.selectedRoleFilter);
    }

    return filtered;
  }

  /**
   * Get paginated users
   */
  get paginatedUsers(): User[] {
    const filtered = this.filteredUsers;
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return filtered.slice(start, end);
  }

  /**
   * Calculate pagination
   */
  private calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.pageSize);
    if (this.currentPage > this.totalPages) {
      this.currentPage = Math.max(1, this.totalPages);
    }
  }

  /**
   * Change page
   */
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  /**
   * Handle search/filter change
   */
  onFilterChange(): void {
    this.currentPage = 1;
    this.calculatePagination();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedRoleFilter = '';
    this.currentPage = 1;
    this.calculatePagination();
  }

  /**
   * Get page numbers for pagination
   */
  getPageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }
}
