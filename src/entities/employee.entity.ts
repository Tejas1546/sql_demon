import { BaseEntity, type IBaseEntity } from "../core/base.entity.js";
import { Column } from "../core/column.decorator.js";
import { Table } from "../core/table.decorator.js";

// Shape of the data required to construct an Employee.
// Extends IBaseEntity to inherit id, createdAt, createdBy, updatedAt, updatedBy.
export interface IEmployee extends IBaseEntity {
    name: string;
    position: string;    // Job title (e.g. "Software Engineer")
    department: string;  // Team or department name (e.g. "Engineering")
    salary: number;
}

// Maps this entity to the "employees" table in the database.
// All CRUD operations (save, findAll, findById, etc.) are inherited from BaseEntity.
@Table('employees')
export class Employee extends BaseEntity implements IEmployee {

    @Column()
    name: string;

    @Column()
    position: string;

    @Column()
    department: string;

    @Column()
    salary: number;

    /**
     * Accepts a partial IEmployee so the class can be instantiated with only some fields
     * (e.g. when hydrating from a DB row where id is already known).
     * Falls back to safe defaults for any missing fields.
     */
    constructor(employee: Partial<IEmployee> = {}) {
        super(employee as IBaseEntity);
        this.name = (employee.name ?? '') as string;
        this.position = (employee.position ?? '') as string;
        this.department = (employee.department ?? '') as string;
        this.salary = Number(employee.salary ?? 0);
    }
}
