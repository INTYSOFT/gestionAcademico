import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { NgFor } from '@angular/common';

interface Order {
  id: string;
  customer: string;
  status: string;
  total: string;
}

@Component({
  standalone: true,
  selector: 'app-ecommerce',
  imports: [MatCardModule, MatTableModule, NgFor],
  template: `
    <div class="grid gap-6 lg:grid-cols-3">
      <mat-card appearance="outlined" class="lg:col-span-2">
        <mat-card-title>{{ ordersLabel }}</mat-card-title>
        <div class="overflow-x-auto">
          <table mat-table [dataSource]="orders" class="min-w-full">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID</th>
              <td mat-cell *matCellDef="let order">{{ order.id }}</td>
            </ng-container>
            <ng-container matColumnDef="customer">
              <th mat-header-cell *matHeaderCellDef>{{ customerLabel }}</th>
              <td mat-cell *matCellDef="let order">{{ order.customer }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>{{ statusLabel }}</th>
              <td mat-cell *matCellDef="let order">{{ order.status }}</td>
            </ng-container>
            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef>{{ totalLabel }}</th>
              <td mat-cell *matCellDef="let order">{{ order.total }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        </div>
      </mat-card>
      <mat-card appearance="outlined">
        <mat-card-title>{{ conversionLabel }}</mat-card-title>
        <mat-card-content>
          <p class="text-5xl font-semibold">4.5%</p>
          <p class="text-sm text-muted-foreground">{{ conversionHint }}</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EcommerceComponent {
  readonly ordersLabel = $localize`:ecommerce.orders@@ecommerceOrders:Pedidos recientes`;
  readonly customerLabel = $localize`:ecommerce.customer@@ecommerceCustomer:Cliente`;
  readonly statusLabel = $localize`:ecommerce.status@@ecommerceStatus:Estado`;
  readonly totalLabel = $localize`:ecommerce.total@@ecommerceTotal:Total`;
  readonly conversionLabel = $localize`:ecommerce.conversion@@ecommerceConversion:Tasa de conversión`;
  readonly conversionHint = $localize`:ecommerce.hint@@ecommerceHint:Comparado con la semana anterior`;

  readonly orders: Order[] = [
    { id: '#1001', customer: 'Luis García', status: 'Pagado', total: '$320.00' },
    { id: '#1002', customer: 'Ana Torres', status: 'Enviado', total: '$150.00' },
    { id: '#1003', customer: 'Carlos Pérez', status: 'Pendiente', total: '$89.99' }
  ];

  readonly displayedColumns = ['id', 'customer', 'status', 'total'];
}
