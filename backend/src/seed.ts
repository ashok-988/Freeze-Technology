import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial reference data...');

  // 1. Roles
  const roles = [
    { id: 'role-admin-01', roleName: 'Admin', description: 'System Administrator' },
    { id: 'role-mgr-01', roleName: 'Manager', description: 'Operations & Sales Manager' },
    { id: 'role-sales-01', roleName: 'Sales Executive', description: 'Sales & Quotations Specialist' },
    { id: 'role-tech-01', roleName: 'Technician', description: 'Field Service Technician' },
    { id: 'role-acct-01', roleName: 'Accountant', description: 'Finance & Invoicing Specialist' },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { roleName: r.roleName },
      update: {},
      create: r,
    });
  }

  // 2. Admin User
  const adminRole = await prisma.role.findUnique({ where: { roleName: 'Admin' } });
  if (adminRole) {
    const passwordHash = await bcrypt.hash(
      process.env.SEED_ADMIN_PASSWORD || 'FreezeAdmin@2026',
      10,
    );
    await prisma.user.upsert({
      where: { email: process.env.SEED_ADMIN_EMAIL || 'admin@freezetechnology.in' },
      update: {},
      create: {
        id: 'usr-admin-01',
        roleId: adminRole.id,
        fullName: 'Ashok Kumar',
        email: process.env.SEED_ADMIN_EMAIL || 'admin@freezetechnology.in',
        phone: '9884955011',
        passwordHash,
        status: 'ACTIVE',
      },
    });
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
