import { PrismaClient, Role, ConversationType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Departments
  const engineering = await prisma.department.upsert({
    where: { slug: 'engineering' },
    update: {},
    create: {
      name: 'Engineering',
      slug: 'engineering',
      description: 'Software development, QA, and infrastructure engineering',
    },
  });

  const finance = await prisma.department.upsert({
    where: { slug: 'finance' },
    update: {},
    create: {
      name: 'Finance',
      slug: 'finance',
      description: 'Corporate accounting, financial planning, and compliance',
    },
  });

  const design = await prisma.department.upsert({
    where: { slug: 'design' },
    update: {},
    create: {
      name: 'Design & UX',
      slug: 'design',
      description: 'Product design, UI/UX, brand identity, and creative',
    },
  });

  const hr = await prisma.department.upsert({
    where: { slug: 'hr' },
    update: {},
    create: {
      name: 'Human Resources',
      slug: 'hr',
      description: 'People operations, talent acquisition, and employee success',
    },
  });

  console.log('Departments created.');

  // Common password hash for Password123!
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 2. Create Users
  const admin = await prisma.user.upsert({
    where: { employeeId: 'ADM001' },
    update: { passwordHash, mustResetPassword: false },
    create: {
      employeeId: 'ADM001',
      email: 'admin@stitch.com',
      name: 'Sarah Connor',
      passwordHash,
      role: Role.ADMIN,
      departmentId: engineering.id,
      isActive: true,
      mustResetPassword: false,
    },
  });

  const dev1 = await prisma.user.upsert({
    where: { employeeId: 'DEV001' },
    update: { passwordHash, mustResetPassword: false },
    create: {
      employeeId: 'DEV001',
      email: 'alex@stitch.com',
      name: 'Alex Mercer',
      passwordHash,
      role: Role.DEVELOPER,
      departmentId: engineering.id,
      isActive: true,
      mustResetPassword: false,
    },
  });

  const dev2 = await prisma.user.upsert({
    where: { employeeId: 'DEV002' },
    update: { passwordHash, mustResetPassword: false },
    create: {
      employeeId: 'DEV002',
      email: 'jordan@stitch.com',
      name: 'Jordan Lee',
      passwordHash,
      role: Role.DEVELOPER,
      departmentId: engineering.id,
      isActive: true,
      mustResetPassword: false,
    },
  });

  const financeUser = await prisma.user.upsert({
    where: { employeeId: 'FIN001' },
    update: { passwordHash, mustResetPassword: false },
    create: {
      employeeId: 'FIN001',
      email: 'elena@stitch.com',
      name: 'Elena Rostova',
      passwordHash,
      role: Role.FINANCE,
      departmentId: finance.id,
      isActive: true,
      mustResetPassword: false,
    },
  });

  console.log('Users created.');

  // 3. Create direct conversation between Admin and Dev1
  const existingConv = await prisma.conversation.findFirst({
    where: {
      type: ConversationType.DIRECT,
      participants: {
        some: { userId: admin.id },
      },
    },
    include: {
      participants: true,
    },
  });

  let directConv = existingConv;
  if (!directConv) {
    directConv = await prisma.conversation.create({
      data: {
        type: ConversationType.DIRECT,
        participants: {
          create: [
            { userId: admin.id },
            { userId: dev1.id },
          ],
        },
        messages: {
          create: [
            {
              senderId: admin.id,
              content: 'Welcome to Stitch Enterprise Collab Hub! How is the new deployment going?',
            },
            {
              senderId: dev1.id,
              content: 'Everything is running smoothly! Next.js frontend and NestJS backend are up.',
            },
          ],
        },
      },
      include: {
        participants: true,
      },
    });
  }

  // 4. Create Group Conversation for Engineering Team
  const existingGroup = await prisma.conversation.findFirst({
    where: {
      type: ConversationType.GROUP,
      name: 'Engineering General',
    },
  });

  if (!existingGroup) {
    await prisma.conversation.create({
      data: {
        type: ConversationType.GROUP,
        name: 'Engineering General',
        departmentId: engineering.id,
        participants: {
          create: [
            { userId: admin.id, isAdmin: true },
            { userId: dev1.id, isAdmin: false },
            { userId: dev2.id, isAdmin: false },
          ],
        },
        messages: {
          create: [
            {
              senderId: admin.id,
              content: 'Team, please review the Q3 architecture updates when you have a moment.',
            },
            {
              senderId: dev2.id,
              content: 'Looking into it now, thanks Sarah!',
            },
          ],
        },
      },
    });
  }

  // 5. Create Calendar Events
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(11, 0, 0, 0);

  await prisma.calendarEvent.create({
    data: {
      title: 'Weekly Engineering Sync',
      description: 'Review project milestones, blockers, and upcoming deployments.',
      startTime: tomorrow,
      endTime: tomorrowEnd,
      location: 'Virtual Meeting Room 1',
      userId: admin.id,
      isAllDay: false,
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
