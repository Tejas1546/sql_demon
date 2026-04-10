import { BaseEntitiy } from "./base.entitiy.js";
import { Table } from "./table.decorator.js";

interface IEmployee extends BaseEntitiy {
  name: string;
  position: string;
  department: string;
  salary: number;
}

@Table("employee")
export class Employee extends BaseEntitiy implements IEmployee {
  name: string;
  position: string;
  department: string;
  salary: number;

  constructor(employee: IEmployee) {
    super(employee);
    this.name = employee.name;
    this.position = employee.position;
    this.department = employee.department;
    this.salary = employee.salary;
  }
}
