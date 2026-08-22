import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

interface CreateUserDto {
  employeeId: string;
  email: string;
  name: string;
  password: string;
  role: Role;
  departmentId: string;
}

interface UpdateUserDto {
  email?: string;
  name?: string;
  role?: Role;
  departmentId?: string;
  isActive?: boolean;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        department: true,
      },
    });
  }

  async findByEmployeeId(employeeId: string) {
    return this.prisma.user.findUnique({
      where: { employeeId },
      include: {
        department: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findAll(filters?: {
    departmentId?: string;
    role?: Role;
    isActive?: boolean;
    search?: string;
  }) {
    const where: any = {};

    if (filters?.departmentId) {
      where.departmentId = filters.departmentId;
    }

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { employeeId: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      include: {
        department: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { employeeId: createUserDto.employeeId },
          { email: createUserDto.email },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.employeeId === createUserDto.employeeId) {
        throw new ConflictException('Employee ID already exists');
      }
      if (existingUser.email === createUserDto.email) {
        throw new ConflictException('Email already exists');
      }
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    // Strip plaintext password property from Prisma model creation object
    const { password, ...userData } = createUserDto;

    return this.prisma.user.create({
      data: {
        ...userData,
        email: createUserDto.email.toLowerCase().trim(),
        passwordHash,
        mustResetPassword: true,
      },
      include: {
        department: true,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findById(id);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingEmail = await this.findByEmail(updateUserDto.email);
      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      include: {
        department: true,
      },
    });
  }

  async adminResetPassword(id: string, customPassword?: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let tempPassword = customPassword;
    if (!tempPassword) {
      tempPassword = '';
      for (let i = 0; i < 12; i++) {
        tempPassword += charset.charAt(Math.floor(Math.random() * charset.length));
      }
    }
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustResetPassword: true,
      },
    });
    return {
      message: 'Password reset successfully',
      temporaryPassword: tempPassword,
    };
  }

  async updatePassword(id: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  async setMustResetPassword(id: string, mustReset: boolean) {
    return this.prisma.user.update({
      where: { id },
      data: { mustResetPassword: mustReset },
    });
  }

  async updateLastLogin(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { lastLogin: new Date() },
    });
  }

  async deactivate(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activate(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async delete(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
