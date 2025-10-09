import { AfterViewInit, ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableDataSource } from '@angular/material/table';

interface Product {
  sku: string;
  name: string;
  category: string;
  price: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
}

@Component({
  standalone: true,
  selector: 'app-ecommerce',
  imports: [MatCardModule, MatTableModule, MatPaginatorModule, MatChipsModule],
  template: `
    <div class="grid gap-6 xl:grid-cols-3">
      <mat-card appearance="outlined" class="xl:col-span-2">
        <mat-card-title>{{ ordersLabel }}</mat-card-title>
        <div class="overflow-x-auto">
          <table mat-table [dataSource]="dataSource" class="min-w-full">
            <ng-container matColumnDef="sku">
              <th mat-header-cell *matHeaderCellDef>{{ skuLabel }}</th>
              <td mat-cell *matCellDef="let product">{{ product.sku }}</td>
            </ng-container>
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>{{ productLabel }}</th>
              <td mat-cell *matCellDef="let product">{{ product.name }}</td>
            </ng-container>
            <ng-container matColumnDef="category">
              <th mat-header-cell *matHeaderCellDef>{{ categoryLabel }}</th>
              <td mat-cell *matCellDef="let product">{{ product.category }}</td>
            </ng-container>
            <ng-container matColumnDef="price">
              <th mat-header-cell *matHeaderCellDef>{{ priceLabel }}</th>
              <td mat-cell *matCellDef="let product">{{ product.price }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>{{ statusLabel }}</th>
              <td mat-cell *matCellDef="let product">
                <mat-chip-set>
                  <mat-chip [color]="statusColor(product.status)" [disableRipple]="true" selected>{{
                    statusDictionary[product.status]
                  }}</mat-chip>
                </mat-chip-set>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
        </div>
        <mat-paginator
          [pageSize]="5"
          [pageSizeOptions]="[5, 10, 20]"
          [showFirstLastButtons]="true"
        ></mat-paginator>
      </mat-card>
      <mat-card appearance="outlined">
        <mat-card-title>{{ conversionLabel }}</mat-card-title>
        <mat-card-content>
          <p class="text-5xl font-semibold text-primary-500">4.5%</p>
          <p class="text-sm text-muted-foreground">{{ conversionHint }}</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EcommerceComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator?: MatPaginator;

  readonly ordersLabel = $localize`:ecommerce.orders@@ecommerceOrders:Pedidos recientes`;
  readonly productLabel = $localize`:ecommerce.product@@ecommerceProduct:Producto`;
  readonly skuLabel = $localize`:ecommerce.sku@@ecommerceSku:SKU`;
  readonly categoryLabel = $localize`:ecommerce.category@@ecommerceCategory:Categoría`;
  readonly priceLabel = $localize`:ecommerce.price@@ecommercePrice:Precio`;
  readonly statusLabel = $localize`:ecommerce.status@@ecommerceStatus:Estado`;
  readonly conversionLabel = $localize`:ecommerce.conversion@@ecommerceConversion:Tasa de conversión`;
  readonly conversionHint = $localize`:ecommerce.hint@@ecommerceHint:Comparado con la semana anterior`;

  readonly statusDictionary: Record<Product['status'], string> = {
    'in-stock': $localize`:ecommerce.status.inStock@@ecommerceStatusInStock:Disponible`,
    'low-stock': $localize`:ecommerce.status.lowStock@@ecommerceStatusLow:Inventario bajo`,
    'out-of-stock': $localize`:ecommerce.status.outStock@@ecommerceStatusOut:Agotado`
  };

  readonly dataSource = new MatTableDataSource<Product>([
    { sku: 'SKU-1001', name: 'Licencia Office 365', category: 'Software', price: '$320.00', status: 'in-stock' },
    { sku: 'SKU-1002', name: 'Curso de IA aplicada', category: 'Cursos', price: '$150.00', status: 'in-stock' },
    { sku: 'SKU-1003', name: 'Suscripción Biblioteca Digital', category: 'Servicios', price: '$89.99', status: 'low-stock' },
    { sku: 'SKU-1004', name: 'Tableta gráfica', category: 'Hardware', price: '$210.00', status: 'out-of-stock' },
    { sku: 'SKU-1005', name: 'Paquete de evaluaciones', category: 'Cursos', price: '$49.00', status: 'in-stock' },
    { sku: 'SKU-1006', name: 'Consultoría académica', category: 'Servicios', price: '$560.00', status: 'low-stock' },
    { sku: 'SKU-1007', name: 'Certificación Scrum', category: 'Certificaciones', price: '$299.00', status: 'in-stock' },
    { sku: 'SKU-1008', name: 'Kit de robótica', category: 'Laboratorio', price: '$420.00', status: 'out-of-stock' }
  ]);

  readonly displayedColumns = ['sku', 'name', 'category', 'price', 'status'];

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }

  statusColor(status: Product['status']): 'primary' | 'warn' | 'accent' {
    switch (status) {
      case 'low-stock':
        return 'accent';
      case 'out-of-stock':
        return 'warn';
      default:
        return 'primary';
    }
  }
}
