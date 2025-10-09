import { NgFor } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { formatCurrency } from '@shared/utils';

interface Product {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly stock: number;
  readonly category: string;
}

const PRODUCTS: Product[] = [
  { id: '1', name: 'Auriculares inalámbricos', price: 129.9, stock: 52, category: 'Audio' },
  { id: '2', name: 'Teclado mecánico', price: 89.5, stock: 15, category: 'Periféricos' },
  { id: '3', name: 'Monitor 27" 4K', price: 429.0, stock: 8, category: 'Pantallas' },
  { id: '4', name: 'Mouse ergonómico', price: 49.99, stock: 35, category: 'Periféricos' },
  { id: '5', name: 'Silla gamer', price: 299.0, stock: 12, category: 'Oficina' },
  { id: '6', name: 'Webcam HD', price: 79.95, stock: 26, category: 'Video' },
  { id: '7', name: 'Dock USB-C', price: 139.0, stock: 18, category: 'Accesorios' },
  { id: '8', name: 'SSD NVMe 1TB', price: 159.49, stock: 44, category: 'Almacenamiento' },
  { id: '9', name: 'Router Wi-Fi 6', price: 189.0, stock: 21, category: 'Networking' },
  { id: '10', name: 'Tablet 10"', price: 349.0, stock: 14, category: 'Tablets' }
];

@Component({
  selector: 'app-ecommerce',
  standalone: true,
  imports: [NgFor, MatTableModule, MatButtonModule, MatIconModule, MatPaginatorModule],
  template: `
    <section class="space-y-8">
      <header class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-2xl font-bold" i18n="@@ecommerce.title">Ecommerce</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400" i18n="@@ecommerce.subtitle">
            Administra tu catálogo y pedidos.
          </p>
        </div>
        <button mat-raised-button color="accent" type="button">
          <mat-icon class="mr-2">add</mat-icon>
          <span i18n="@@ecommerce.addProduct">Nuevo producto</span>
        </button>
      </header>

      <article class="card">
        <header class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold" i18n="@@ecommerce.inventory">Inventario</h2>
          <span class="text-sm text-slate-500 dark:text-slate-400" i18n="@@ecommerce.totalItems">
            {{ dataSource.data.length }} artículos
          </span>
        </header>
        <div class="overflow-x-auto">
          <table mat-table [dataSource]="dataSource" class="w-full min-w-[640px]">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef i18n="@@ecommerce.table.product">Producto</th>
              <td mat-cell *matCellDef="let row">{{ row.name }}</td>
            </ng-container>

            <ng-container matColumnDef="category">
              <th mat-header-cell *matHeaderCellDef i18n="@@ecommerce.table.category">Categoría</th>
              <td mat-cell *matCellDef="let row">{{ row.category }}</td>
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
                <button
                  mat-icon-button
                  color="primary"
                  type="button"
                  aria-label="Editar"
                  i18n-aria-label="@@ecommerce.table.edit"
                >
                  <mat-icon>edit</mat-icon>
                </button>
                <button
                  mat-icon-button
                  color="warn"
                  type="button"
                  aria-label="Eliminar"
                  i18n-aria-label="@@ecommerce.table.delete"
                >
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        </div>
        <mat-paginator
          #paginator
          [pageSizeOptions]="[5, 10, 25]"
          [pageSize]="5"
          showFirstLastButtons
          aria-label="Paginator"
          i18n-aria-label="@@ecommerce.paginator"
        ></mat-paginator>
      </article>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EcommerceComponent implements AfterViewInit {
  readonly displayedColumns = ['name', 'category', 'price', 'stock', 'actions'] as const;
  readonly dataSource = new MatTableDataSource(PRODUCTS);

  @ViewChild(MatPaginator) paginator?: MatPaginator;

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }

  formatPrice(value: number): string {
    return formatCurrency(value, 'es-ES', 'EUR');
  }
}
