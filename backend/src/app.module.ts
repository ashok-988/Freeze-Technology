import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { CustomersModule } from './customers/customers.module';
import { ProductsModule } from './products/products.module';
import { QuotationsModule } from './quotations/quotations.module';
import { PaymentsModule } from './payments/payments.module';
import { ServicesModule } from './services/services.module';
import { AMCModule } from './amc/amc.module';
import { InstallationsModule } from './installations/installations.module';
import { InventoryModule } from './inventory/inventory.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { EmployeesModule } from './employees/employees.module';
import { AttendanceModule } from './attendance/attendance.module';
import { PayrollModule } from './payroll/payroll.module';
import { PayablesModule } from './payables/payables.module';
import { ReportsModule } from './reports/reports.module';
import { AssetsModule } from './assets/assets.module';
import { PreventiveMaintenanceModule } from './preventive-maintenance/preventive-maintenance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SettingsModule } from './settings/settings.module';
import { ExecutiveDashboardModule } from './executive-dashboard/executive-dashboard.module';
import { AccountingModule } from './accounting/accounting.module';
import { LegacyModule } from './legacy/legacy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    CustomersModule,
    ProductsModule,
    QuotationsModule,
    PaymentsModule,
    ServicesModule,
    AMCModule,
    InstallationsModule,
    InventoryModule,
    SuppliersModule,
    PurchaseOrdersModule,
    EmployeesModule,
    AttendanceModule,
    PayrollModule,
    PayablesModule,
    ReportsModule,
    AssetsModule,
    PreventiveMaintenanceModule,
    NotificationsModule,
    SettingsModule,
    ExecutiveDashboardModule,
    AccountingModule,
    LegacyModule,
  ],
})
export class AppModule {}


