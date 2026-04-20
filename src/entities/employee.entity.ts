import { BaseEntity, type IBaseEntity } from "../core/base.entity.js";
import { Column } from "../core/column.decorator.js";
import { Table } from "../core/table.decorator.js";

export interface IEmployee extends IBaseEntity {
    name: string;
    position: string;
    department: string;
    salary: number;
}

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

    constructor(employee: Partial<IEmployee> = {}) {
        super(employee as IBaseEntity);
        this.name = (employee.name ?? '') as string;
        this.position = (employee.position ?? '') as string;
        this.department = (employee.department ?? '') as string;
        this.salary = Number(employee.salary ?? 0);
    }

}