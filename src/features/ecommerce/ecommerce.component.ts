import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { formatCurrency } from '@shared/utils';

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

const PRODUCTS: Product[] = [
  { id: '1', name: 'Auriculares inalámbricos', price: 129.9, stock: 52 },
  { id: '2', name: 'Teclado mecánico', price: 89.5, stock: 15 },
  { id: '3', name: 'Monitor 27" 4K', price: 429.0, stock: 8 }
];

@Component({
  selector: 'app-ecommerce',
  standalone: true,
  imports: [NgFor, MatTableModule, MatButtonModule, MatIconModule],
  template: `
    <section class="space-y-8">
      <header class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-2xl font-bold" i18n="@@ecommerce.title">Ecommerce</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400" i18n="@@ecommerce.subtitle">
            Administra tu catálogo y pedidos.
          </p>
        </div>
        <button mat-raised-button color="accent">
          <mat-icon class="mr-2">add</mat-icon>
          <span i18n="@@ecommerce.addProduct">Nuevo producto</span>
        </button>
      </header>

      <article class="card">
        <h2 class="mb-4 text-lg font-semibold" i18n="@@ecommerce.inventory">Inventario</h2>
        <table mat-table [dataSource]="products" class="w-full">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef i18n="@@ecommerce.table.product">Producto</th>
            <td mat-cell *matCellDef="let row">{{ row.name }}</td>
          </ng-container>

          <ng-container matColumnDef="price">
            <th mat-header-cell *matHeaderCellDef i18n="@@ecommerce.table.price">Precio</th>
            <td mat-cell *matCellDef="let row">{{ formatPrice(row.price) }}</td>
          </ng-container>

          <ng-container matColumnDef="stock">
            <th mat-header-cell *matHeaderCellDef i18n="@@ecommerce.table.stock">Stock</th>
            <td mat-cell *matCellDef="let row">{{ row.stock }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef i18n="@@ecommerce.table.actions">Acciones</th>
            <td mat-cell *matCellDef="let row">
              <button mat-icon-button color="primary" type="button" aria-label="Editar" i18n-aria-label>
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" type="button" aria-label="Eliminar" i18n-aria-label>
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </article>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EcommerceComponent {
  readonly products = PRODUCTS;
  readonly displayedColumns = ['name', 'price', 'stock', 'actions'];

  formatPrice(value: number): string {
    return formatCurrency(value, 'es-ES', 'EUR');
  }
}
