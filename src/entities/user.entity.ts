import { BaseEntity, type IBaseEntity } from "../core/base.entity.js";
import { Column } from "../core/column.decorator.js";
import { Table } from "../core/table.decorator.js";


export interface IUser extends IBaseEntity{
    name: string;
    address: string;
    dob: Date;
    email: string;
}

@Table('users')
export class User extends BaseEntity implements IUser {

    @Column()
    name: string;
    @Column()
    address: string;
    @Column()
    dob: Date;
    @Column()
    email: string;


    constructor(user: Partial<IUser> = {}) {
        super(user as IBaseEntity);
        this.name = (user.name ?? '') as string;
        this.address = (user.address ?? '') as string;
        this.dob = (user.dob ?? new Date(0)) as Date;
        this.email = (user.email ?? '') as string;
    }
    
}