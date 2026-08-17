import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateDepartmentDto {
  name: string;
  slug: string;
  description?: string;
}

interface UpdateDepartmentDto {
  name?: string;
  slug?: string;
  description?: string;
}

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.department.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findById(id: string) {
    return this.prisma.department.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.department.findUnique({
      where: { slug },
    });
  }

  async create(createDepartmentDto: CreateDepartmentDto) {
    const existingSlug = await this.findBySlug(createDepartmentDto.slug);
    if (existingSlug) {
      throw new ConflictException('Department slug already exists');
    }

    return this.prisma.department.create({
      data: createDepartmentDto,
    });
  }

  async update(id: string, updateDepartmentDto: UpdateDepartmentDto) {
    const department = await this.findById(id);
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    if (updateDepartmentDto.slug && updateDepartmentDto.slug !== department.slug) {
      const existingSlug = await this.findBySlug(updateDepartmentDto.slug);
      if (existingSlug) {
        throw new ConflictException('Department slug already exists');
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: updateDepartmentDto,
    });
  }

  async delete(id: string) {
    const department = await this.findById(id);
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    if (department.users.length > 0) {
      throw new ConflictException('Cannot delete department with users');
    }

    return this.prisma.department.delete({
      where: { id },
    });
  }
}
