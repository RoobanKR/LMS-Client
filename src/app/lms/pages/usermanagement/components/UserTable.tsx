"use client";
import { UserTable as UITable } from "@/components/ui/alterationTable";
import { User, Column } from "./types";

interface UserTableProps {
  users: User[];
  isLoading: boolean;
  columns: Column<User>[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
  };
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  isLoading,
  columns,
  pagination,
}) => {
  return (
    <UITable
      users={users}
      isLoading={isLoading}
      columns={columns}
      pagination={pagination}
    />
  );
};